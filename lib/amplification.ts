import Parser from "rss-parser";
import {
  getSupabaseAdmin,
  type AmplificationMention,
  type AmplificationCluster,
} from "./supabase";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  },
});

export const AMPLIFICATION_WINDOW_HOURS = 24;
export const CLUSTER_ALERT_THRESHOLD = 3;
const JACCARD_MATCH_THRESHOLD = 0.3;

// Indonesian + English controversy trigger terms that suggest a Kompas article
// has been challenged, denied, or called out publicly.
const CONTROVERSY_TRIGGERS = [
  "bantah",
  "keliru",
  "klarifikasi",
  "teguran",
  "hoax",
  "palsu",
  "bohong",
  "protes",
  "dipelintir",
  "mengecam",
  "out of context",
  "retract",
  "correction",
];

const STOPWORDS = new Set([
  "dan", "di", "yang", "untuk", "dari", "dengan", "ini", "itu", "pada",
  "adalah", "ke", "tidak", "akan", "juga", "sudah", "bisa", "ada", "oleh",
  "saat", "telah", "atau", "dalam", "lebih", "baru", "harus", "bahwa",
  "seperti", "karena", "mereka", "kami", "kita", "atas", "hingga", "setelah",
  "masih", "antara", "secara", "menjadi", "lagi", "tahun", "kata", "bagi",
  "tersebut", "serta", "namun", "tetapi", "sedang", "melalui", "terhadap",
  "kepada", "the", "a", "an", "and", "or", "of", "for", "to", "in", "on",
  "at", "is", "was", "by", "with", "as", "from", "that", "this",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function googleNewsRss(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${encoded}&hl=id&gl=ID&ceid=ID:id`;
}

function redditSearchRss(query: string): string {
  const encoded = encodeURIComponent(query);
  return `https://www.reddit.com/search.rss?q=${encoded}&sort=new`;
}

export function buildWatchQueries(): Array<{ query: string; feeds: string[] }> {
  const triggerGroup = `(${CONTROVERSY_TRIGGERS.map((t) => `"${t}"`).join(" OR ")})`;
  const brands = ["Kompas", "Harian Kompas", "Kompas.com", "Kompas.id"];

  const queries: Array<{ query: string; feeds: string[] }> = [];

  for (const brand of brands) {
    const q = `"${brand}" ${triggerGroup}`;
    queries.push({
      query: q,
      feeds: [googleNewsRss(q)],
    });
  }

  queries.push({
    query: "Kompas Indonesia",
    feeds: [redditSearchRss("Kompas Indonesia")],
  });

  return queries;
}

interface RawMention {
  url: string;
  platform: string;
  source: string;
  title: string;
  snippet: string;
  published_at: string | null;
  trigger_query: string;
}

async function fetchFeed(
  feedUrl: string,
  platform: string,
  trigger: string
): Promise<RawMention[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    return feed.items.slice(0, 20).map((item) => ({
      url: item.link || "",
      platform,
      source: item.creator || (item.link ? new URL(item.link).hostname : ""),
      title: (item.title || "").trim(),
      snippet: (item.contentSnippet || item.content || "").slice(0, 500),
      published_at: item.isoDate || null,
      trigger_query: trigger,
    }));
  } catch {
    return [];
  }
}

export interface ScanSummary {
  fetched: number;
  inserted: number;
  clustersActive: number;
  clustersNew: number;
}

export async function runAmplificationScan(
  onProgress?: (msg: string) => void
): Promise<ScanSummary> {
  const watches = buildWatchQueries();
  const raw: RawMention[] = [];

  onProgress?.(`Fetching ${watches.length} watch queries`);

  for (const w of watches) {
    for (const feedUrl of w.feeds) {
      const platform = feedUrl.includes("reddit.com")
        ? "reddit"
        : "google_news";
      const items = await fetchFeed(feedUrl, platform, w.query);
      raw.push(...items);
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  onProgress?.(`Fetched ${raw.length} raw mentions`);

  const admin = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - 72 * 3600 * 1000
  ).toISOString();
  const { data: existing } = await admin
    .from("amplification_mentions")
    .select("url")
    .gte("scraped_at", cutoff);
  const seen = new Set((existing || []).map((r: { url: string }) => r.url));

  const toInsert: Omit<AmplificationMention, "id">[] = [];
  const urlSet = new Set<string>();
  for (const m of raw) {
    if (!m.url || !m.title) continue;
    if (seen.has(m.url) || urlSet.has(m.url)) continue;
    urlSet.add(m.url);
    toInsert.push({
      url: m.url,
      platform: m.platform,
      source: m.source,
      title: m.title,
      snippet: m.snippet,
      published_at: m.published_at,
      tokens: tokenize(`${m.title} ${m.snippet}`).slice(0, 40),
      trigger_query: m.trigger_query,
      cluster_id: null,
    });
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const { data } = await admin
      .from("amplification_mentions")
      .upsert(toInsert, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
    inserted = data?.length || 0;
  }

  onProgress?.(`Inserted ${inserted} new mentions, clustering…`);
  const { clustersActive, clustersNew } = await reclusterRecent();

  return {
    fetched: raw.length,
    inserted,
    clustersActive,
    clustersNew,
  };
}

async function reclusterRecent(): Promise<{
  clustersActive: number;
  clustersNew: number;
}> {
  const admin = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - AMPLIFICATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const { data: mentions } = await admin
    .from("amplification_mentions")
    .select("*")
    .gte("scraped_at", cutoff)
    .order("scraped_at", { ascending: true });

  const items = (mentions || []) as AmplificationMention[];
  if (items.length === 0) {
    await admin
      .from("amplification_clusters")
      .update({ status: "resolved", updated_at: new Date().toISOString() })
      .eq("status", "active");
    return { clustersActive: 0, clustersNew: 0 };
  }

  const groups: AmplificationMention[][] = [];
  for (const m of items) {
    let placed = false;
    for (const g of groups) {
      if (g.some((existing) => jaccard(existing.tokens, m.tokens) >= JACCARD_MATCH_THRESHOLD)) {
        g.push(m);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([m]);
  }

  const qualifying = groups.filter((g) => {
    const distinctSources = new Set(g.map((m) => m.source)).size;
    return g.length >= CLUSTER_ALERT_THRESHOLD && distinctSources >= CLUSTER_ALERT_THRESHOLD;
  });

  // Mark previous active clusters resolved; we rebuild each scan for simplicity.
  await admin
    .from("amplification_clusters")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("status", "active");

  // Clear stale cluster_id references on mentions outside window
  await admin
    .from("amplification_mentions")
    .update({ cluster_id: null })
    .lt("scraped_at", cutoff);

  let clustersNew = 0;
  for (const g of qualifying) {
    const tokenCounts = new Map<string, number>();
    for (const m of g) {
      for (const t of m.tokens) {
        tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
      }
    }
    const topTokens = [...tokenCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t]) => t);

    const times = g
      .map((m) => m.scraped_at || m.published_at || new Date().toISOString())
      .sort();
    const firstSeen = times[0];
    const lastSeen = times[times.length - 1];
    const sourceCount = new Set(g.map((m) => m.source)).size;

    const cluster: Omit<AmplificationCluster, "id"> = {
      keywords: topTokens,
      first_seen: firstSeen,
      last_seen: lastSeen,
      mention_count: g.length,
      source_count: sourceCount,
      status: "active",
    };

    const { data } = await admin
      .from("amplification_clusters")
      .insert(cluster)
      .select("id")
      .single();

    const newId = (data as { id: number } | null)?.id;
    if (newId) {
      clustersNew++;
      await admin
        .from("amplification_mentions")
        .update({ cluster_id: newId })
        .in(
          "id",
          g.map((m) => m.id).filter((x): x is number => typeof x === "number")
        );
    }
  }

  return { clustersActive: qualifying.length, clustersNew };
}

export async function getActiveClusters(): Promise<
  Array<AmplificationCluster & { mentions: AmplificationMention[] }>
> {
  const admin = getSupabaseAdmin();
  const { data: clusters } = await admin
    .from("amplification_clusters")
    .select("*")
    .eq("status", "active")
    .order("last_seen", { ascending: false });

  const list = (clusters || []) as AmplificationCluster[];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id).filter((x): x is number => typeof x === "number");
  const { data: mentions } = await admin
    .from("amplification_mentions")
    .select("*")
    .in("cluster_id", ids)
    .order("scraped_at", { ascending: false });

  const byCluster = new Map<number, AmplificationMention[]>();
  for (const m of (mentions || []) as AmplificationMention[]) {
    if (m.cluster_id == null) continue;
    const arr = byCluster.get(m.cluster_id) || [];
    arr.push(m);
    byCluster.set(m.cluster_id, arr);
  }

  return list.map((c) => ({
    ...c,
    mentions: (c.id ? byCluster.get(c.id) : undefined) || [],
  }));
}
