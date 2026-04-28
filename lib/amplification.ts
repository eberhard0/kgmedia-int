import Parser from "rss-parser";
import { db } from "./db";
import type { AmplificationMention, AmplificationCluster } from "./types";
import { isApifyEnabled, runEntityApifySearches } from "./apify";
import {
  isEmbeddingsEnabled,
  embedBatch,
  cosineSim,
  SEMANTIC_CLUSTER_THRESHOLD,
} from "./embeddings";
import { extractEntities } from "./entities";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  },
});

export const AMPLIFICATION_WINDOW_HOURS = 24;

// Two-tier cluster thresholds (24h window). Both tiers require >= 3 distinct
// sources — a single viral post that gets reposted does not count.
export const TRENDING_MIN_MENTIONS = 10;
export const CRITICAL_MIN_MENTIONS = 100;
export const CLUSTER_MIN_SOURCES = 3;

// Brand filter — only mentions that explicitly name a KG Media brand or
// affiliate are stored. Matched case-insensitively against title + snippet.
export const KG_BRAND_TERMS = [
  "kompas",
  "kompas.com",
  "kompas.id",
  "hariankompas",
  "kompastv",
  "kompasiana",
  "kontan",
  "gramedia",
  "santika",
];

function mentionsBrand(title: string, snippet: string): boolean {
  const haystack = `${title} ${snippet}`.toLowerCase();
  return KG_BRAND_TERMS.some((t) => haystack.includes(t));
}
const JACCARD_MATCH_THRESHOLD = 0.2;

// Indonesian + English controversy trigger terms that suggest a Kompas article
// has been challenged, denied, or called out publicly.
const CONTROVERSY_TRIGGERS = [
  // Denial / rebuttal
  "bantah", "bantahan", "membantah", "dibantah",
  // Error / correction
  "keliru", "ralat", "koreksi",
  // Clarification
  "klarifikasi", "diklarifikasi",
  // Rebuke / reprimand
  "teguran", "menegur", "ditegur", "tegur",
  // Fabrication
  "hoax", "hoaks", "palsu", "bohong", "dusta",
  // Protest / criticism
  "protes", "diprotes", "memprotes", "demo",
  "mengecam", "dikecam", "kecaman",
  // Misleading
  "menyesatkan", "sesat", "dipelintir", "pelintir",
  // Apology / retraction
  "permintaan maaf", "meminta maaf", "ralat",
  // Legal action
  "somasi", "disomasi", "tuntut", "menggugat", "digugat",
  // English
  "out of context", "taken out of context",
  "retract", "retraction", "correction",
  "denied", "disputed", "misrepresented",
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

function subredditRss(sub: string): string {
  return `https://www.reddit.com/r/${sub}/new/.rss?limit=25`;
}

const NITTER_INSTANCE = "https://nitter.poast.org";
function nitterSearchRss(query: string): string {
  return `${NITTER_INSTANCE}/search/rss?f=tweets&q=${encodeURIComponent(query)}`;
}

// Brand-scoped Kompas topics whose articles drive the entity watchlist.
const KOMPAS_BRAND_TOPIC_PREFIXES = [
  "Kompas.id",
  "Kompas.com",
  "Kompas TV",
  "Kontan",
];

interface KompasArticleRef {
  id: number;
  title: string;
  url: string;
  topic: string;
}

interface EntityWatch {
  entity: string;
  article: KompasArticleRef;
  feeds: string[];
}

async function getRecentKompasArticles(): Promise<KompasArticleRef[]> {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  // Build (topic ILIKE $a OR topic ILIKE $b ...) with one param per prefix
  const orClauses = KOMPAS_BRAND_TOPIC_PREFIXES.map(
    (_, i) => `topic ILIKE $${i + 1}`
  ).join(" OR ");
  const params: unknown[] = KOMPAS_BRAND_TOPIC_PREFIXES.map((p) => `${p}%`);
  params.push(cutoff);
  return db.many<KompasArticleRef>(
    `SELECT id, title, url, topic FROM articles
     WHERE (${orClauses}) AND scraped_at >= $${params.length}
     ORDER BY scraped_at DESC
     LIMIT 60`,
    params
  );
}

async function buildEntityWatches(
  maxEntities = 30
): Promise<EntityWatch[]> {
  const articles = await getRecentKompasArticles();
  const seen = new Set<string>();
  const watches: EntityWatch[] = [];
  for (const article of articles) {
    const entities = await extractEntities(article.title);
    for (const entity of entities) {
      const key = entity.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const q = `"${entity}" Kompas`;
      watches.push({
        entity,
        article,
        feeds: [googleNewsRss(q), redditSearchRss(`${entity} Kompas`)],
      });
      if (watches.length >= maxEntities) return watches;
    }
  }
  return watches;
}

export interface WatchTarget {
  query: string;
  feeds: string[];
  article?: KompasArticleRef;
  entity?: string;
}

export async function buildWatchQueries(): Promise<WatchTarget[]> {
  const triggerGroup = `(${CONTROVERSY_TRIGGERS.map((t) => `"${t}"`).join(" OR ")})`;
  const brands = ["Kompas", "Harian Kompas", "Kompas.com", "Kompas.id", "Kompas TV", "Kontan"];
  const queries: WatchTarget[] = [];

  // 1. Brand × trigger-group Google News queries (broad controversy catch-all)
  for (const brand of brands) {
    const q = `"${brand}" ${triggerGroup}`;
    queries.push({ query: q, feeds: [googleNewsRss(q)] });
  }

  // 2. Per-entity searches derived from recent Kompas articles
  const entityWatches = await buildEntityWatches();
  for (const w of entityWatches) {
    queries.push({
      query: `"${w.entity}" Kompas`,
      feeds: w.feeds,
      article: w.article,
      entity: w.entity,
    });
  }

  // 3. Reddit search + subreddit direct feeds
  queries.push({
    query: "Kompas Indonesia (reddit search)",
    feeds: [redditSearchRss("Kompas Indonesia")],
  });
  for (const sub of ["indonesia", "indonesian"]) {
    queries.push({
      query: `r/${sub}`,
      feeds: [subredditRss(sub)],
    });
  }

  // 4. Nitter X/Twitter search (best-effort; instance may be down)
  queries.push({
    query: "Kompas (X/Twitter via Nitter)",
    feeds: [nitterSearchRss(`Kompas ${CONTROVERSY_TRIGGERS.slice(0, 5).join(" OR ")}`)],
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
  kompas_article_id: number | null;
  triggered_entity: string;
}

async function fetchFeed(
  feedUrl: string,
  platform: string,
  trigger: string,
  articleId: number | null = null,
  entity = ""
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
      kompas_article_id: articleId,
      triggered_entity: entity,
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
  clustersCritical: number;
}

function platformFor(feedUrl: string): string {
  if (feedUrl.includes("reddit.com")) return "reddit";
  if (feedUrl.includes("nitter")) return "twitter";
  return "google_news";
}

export async function runAmplificationScan(
  onProgress?: (msg: string) => void
): Promise<ScanSummary> {
  const watches = await buildWatchQueries();
  const raw: RawMention[] = [];

  onProgress?.(`Fetching ${watches.length} watch queries`);

  for (const w of watches) {
    for (const feedUrl of w.feeds) {
      const items = await fetchFeed(
        feedUrl,
        platformFor(feedUrl),
        w.query,
        w.article?.id ?? null,
        w.entity ?? ""
      );
      raw.push(...items);
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  if (isApifyEnabled()) {
    onProgress?.("Apify enabled — fetching TikTok / Instagram / Facebook / X posts");
    const entityWatches = watches
      .filter((w) => w.entity && w.article)
      .map((w) => ({
        entity: w.entity!,
        articleId: w.article!.id,
      }));
    const facebookPages = [
      "https://www.facebook.com/hariankompas",
      "https://www.facebook.com/KOMPAScom",
      "https://www.facebook.com/kompastv",
      "https://www.facebook.com/KOMPASIANAdotcom",
    ];
    const apifyMentions = await runEntityApifySearches(
      entityWatches,
      facebookPages
    );
    onProgress?.(`Apify returned ${apifyMentions.length} social posts`);
    if (apifyMentions.length > 0) {
      const breakdown: Record<string, number> = {};
      for (const m of apifyMentions) {
        breakdown[m.platform] = (breakdown[m.platform] || 0) + 1;
      }
      const breakdownStr = Object.entries(breakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([p, n]) => `${p}=${n}`)
        .join(", ");
      onProgress?.(`Apify breakdown: ${breakdownStr}`);
    }
    raw.push(
      ...apifyMentions.map((m) => ({
        ...m,
        kompas_article_id: m.kompas_article_id ?? null,
        triggered_entity: m.triggered_entity ?? "",
      }))
    );
  }

  onProgress?.(`Fetched ${raw.length} raw mentions`);

  const cutoff = new Date(
    Date.now() - 72 * 3600 * 1000
  ).toISOString();
  const existing = await db.many<{ url: string }>(
    `SELECT url FROM amplification_mentions
     WHERE scraped_at >= $1
     LIMIT 20000`,
    [cutoff]
  );
  const seen = new Set(existing.map((r) => r.url));

  const toInsert: Omit<AmplificationMention, "id">[] = [];
  const urlSet = new Set<string>();
  let droppedNoBrand = 0;
  for (const m of raw) {
    if (!m.url || !m.title) continue;
    if (seen.has(m.url) || urlSet.has(m.url)) continue;
    if (!mentionsBrand(m.title, m.snippet)) {
      droppedNoBrand++;
      continue;
    }
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
      kompas_article_id: m.kompas_article_id,
      triggered_entity: m.triggered_entity,
    });
  }

  let inserted = 0;
  if (toInsert.length > 0) {
    const cols = [
      "url", "platform", "source", "title", "snippet", "published_at",
      "tokens", "trigger_query", "cluster_id",
      "kompas_article_id", "triggered_entity",
    ];
    const valuesSql: string[] = [];
    const params: unknown[] = [];
    for (const m of toInsert) {
      const start = params.length;
      params.push(
        m.url, m.platform, m.source, m.title, m.snippet, m.published_at,
        m.tokens, m.trigger_query, m.cluster_id,
        m.kompas_article_id ?? null, m.triggered_entity ?? null
      );
      valuesSql.push(
        `(${cols.map((_, i) => `$${start + i + 1}`).join(", ")})`
      );
    }
    try {
      const { rowCount } = await db.query(
        `INSERT INTO amplification_mentions (${cols.join(", ")})
         VALUES ${valuesSql.join(", ")}
         ON CONFLICT (url) DO NOTHING
         RETURNING id`,
        params
      );
      inserted = rowCount || 0;
    } catch (err) {
      throw new Error(
        `amplification_mentions insert failed: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  if (droppedNoBrand > 0) {
    onProgress?.(`Dropped ${droppedNoBrand} mentions that did not name a KG brand`);
  }
  onProgress?.(`Inserted ${inserted} new mentions, clustering…`);
  const { clustersActive, clustersNew, clustersCritical } = await reclusterRecent();

  return {
    fetched: raw.length,
    inserted,
    clustersActive,
    clustersNew,
    clustersCritical,
  };
}

async function reclusterRecent(): Promise<{
  clustersActive: number;
  clustersNew: number;
  clustersCritical: number;
}> {
  const cutoff = new Date(
    Date.now() - AMPLIFICATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const items = await db.many<AmplificationMention>(
    `SELECT * FROM amplification_mentions
     WHERE scraped_at >= $1
     ORDER BY scraped_at ASC
     LIMIT 20000`,
    [cutoff]
  );

  if (items.length === 0) {
    await db.query(
      `UPDATE amplification_clusters
       SET status = 'resolved', updated_at = NOW()
       WHERE status = 'active'`
    );
    return { clustersActive: 0, clustersNew: 0, clustersCritical: 0 };
  }

  let groups: AmplificationMention[][];
  if (isEmbeddingsEnabled()) {
    const texts = items.map((m) => `${m.title}\n${m.tokens.join(" ")}`);
    const embeds = await embedBatch(texts);
    groups = [];
    const groupEmbeds: number[][][] = [];
    for (let i = 0; i < items.length; i++) {
      const e = embeds[i];
      let placed = false;
      for (let gi = 0; gi < groups.length; gi++) {
        if (
          groupEmbeds[gi].some(
            (ge) => cosineSim(ge, e) >= SEMANTIC_CLUSTER_THRESHOLD
          )
        ) {
          groups[gi].push(items[i]);
          groupEmbeds[gi].push(e);
          placed = true;
          break;
        }
      }
      if (!placed) {
        groups.push([items[i]]);
        groupEmbeds.push([e]);
      }
    }
  } else {
    groups = [];
    for (const m of items) {
      let placed = false;
      for (const g of groups) {
        if (
          g.some(
            (existing) =>
              jaccard(existing.tokens, m.tokens) >= JACCARD_MATCH_THRESHOLD
          )
        ) {
          g.push(m);
          placed = true;
          break;
        }
      }
      if (!placed) groups.push([m]);
    }
  }

  const qualifying = groups.filter((g) => {
    const distinctSources = new Set(g.map((m) => m.source)).size;
    return g.length >= TRENDING_MIN_MENTIONS && distinctSources >= CLUSTER_MIN_SOURCES;
  });

  // Mark previous active clusters resolved; we rebuild each scan for simplicity.
  await db.query(
    `UPDATE amplification_clusters
     SET status = 'resolved', updated_at = NOW()
     WHERE status = 'active'`
  );

  // Clear stale cluster_id references on mentions outside window
  await db.query(
    `UPDATE amplification_mentions
     SET cluster_id = NULL
     WHERE scraped_at < $1`,
    [cutoff]
  );

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

    const articleCounts = new Map<number, number>();
    const entityCounts = new Map<string, number>();
    for (const m of g) {
      if (m.kompas_article_id) {
        articleCounts.set(
          m.kompas_article_id,
          (articleCounts.get(m.kompas_article_id) || 0) + 1
        );
      }
      if (m.triggered_entity) {
        entityCounts.set(
          m.triggered_entity,
          (entityCounts.get(m.triggered_entity) || 0) + 1
        );
      }
    }
    const dominantArticle = [...articleCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? null;
    const dominantEntity = [...entityCounts.entries()].sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? "";

    const inserted = await db.maybeOne<{ id: number }>(
      `INSERT INTO amplification_clusters
         (keywords, first_seen, last_seen, mention_count, source_count,
          status, kompas_article_id, triggered_entity)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
       RETURNING id`,
      [
        topTokens,
        firstSeen,
        lastSeen,
        g.length,
        sourceCount,
        dominantArticle,
        dominantEntity,
      ]
    );
    const newId = inserted?.id;
    if (newId) {
      clustersNew++;
      const mentionIds = g
        .map((m) => m.id)
        .filter((x): x is number => typeof x === "number");
      if (mentionIds.length > 0) {
        await db.query(
          `UPDATE amplification_mentions
           SET cluster_id = $1
           WHERE id = ANY($2::bigint[])`,
          [newId, mentionIds]
        );
      }
    }
  }

  const clustersCritical = qualifying.filter(
    (g) => g.length >= CRITICAL_MIN_MENTIONS
  ).length;
  return { clustersActive: qualifying.length, clustersNew, clustersCritical };
}

export interface PlatformStat {
  platform: string;
  total: number;
  top_entity: string | null;
  hourly: number[];
}

export interface AmplificationStats {
  platforms: PlatformStat[];
  timeline: {
    labels: string[];
    series: Record<string, number[]>;
    total_per_hour: number[];
  };
  total_mentions: number;
}

const TRACKED_PLATFORMS = [
  "google_news",
  "reddit",
  "twitter",
  "tiktok",
  "instagram",
  "facebook",
];
const TIMELINE_HOURS = 24;

export async function getAmplificationStats(): Promise<AmplificationStats> {
  const cutoff = new Date(
    Date.now() - TIMELINE_HOURS * 3600 * 1000
  ).toISOString();
  const items = await db.many<{
    platform: string;
    triggered_entity: string | null;
    scraped_at: string;
    published_at: string | null;
  }>(
    `SELECT platform, triggered_entity, scraped_at, published_at
     FROM amplification_mentions
     WHERE scraped_at >= $1
     LIMIT 20000`,
    [cutoff]
  );

  const now = Date.now();
  const buckets = new Map<string, number[]>();
  const totals = new Map<string, number>();
  const entityCounts = new Map<string, Map<string, number>>();
  for (const p of TRACKED_PLATFORMS) {
    buckets.set(p, new Array(TIMELINE_HOURS).fill(0));
    totals.set(p, 0);
    entityCounts.set(p, new Map());
  }

  for (const m of items) {
    const tsRaw = m.published_at || m.scraped_at;
    if (!tsRaw) continue;
    const ts = new Date(tsRaw).getTime();
    if (Number.isNaN(ts)) continue;
    const ageHours = Math.floor((now - ts) / 3_600_000);
    if (ageHours < 0 || ageHours >= TIMELINE_HOURS) continue;
    const bucket = TIMELINE_HOURS - 1 - ageHours;
    const p = m.platform;
    if (!buckets.has(p)) {
      buckets.set(p, new Array(TIMELINE_HOURS).fill(0));
      totals.set(p, 0);
      entityCounts.set(p, new Map());
    }
    buckets.get(p)![bucket]++;
    totals.set(p, (totals.get(p) || 0) + 1);
    if (m.triggered_entity) {
      const ec = entityCounts.get(p)!;
      ec.set(m.triggered_entity, (ec.get(m.triggered_entity) || 0) + 1);
    }
  }

  const platforms: PlatformStat[] = TRACKED_PLATFORMS.map((p) => {
    const ec = entityCounts.get(p) || new Map();
    let topEntity: string | null = null;
    let topCount = 0;
    for (const [e, c] of ec) {
      if (c > topCount) {
        topCount = c;
        topEntity = e;
      }
    }
    return {
      platform: p,
      total: totals.get(p) || 0,
      top_entity: topEntity,
      hourly: buckets.get(p) || new Array(TIMELINE_HOURS).fill(0),
    };
  });

  const totalPerHour = new Array(TIMELINE_HOURS).fill(0);
  const series: Record<string, number[]> = {};
  for (const p of TRACKED_PLATFORMS) {
    series[p] = buckets.get(p) || new Array(TIMELINE_HOURS).fill(0);
    for (let i = 0; i < TIMELINE_HOURS; i++) {
      totalPerHour[i] += series[p][i];
    }
  }
  const labels: string[] = [];
  for (let i = 0; i < TIMELINE_HOURS; i++) {
    const h = TIMELINE_HOURS - 1 - i;
    labels.push(h === 0 ? "now" : `${h}h`);
  }

  return {
    platforms,
    timeline: { labels, series, total_per_hour: totalPerHour },
    total_mentions: items.length,
  };
}

export async function getRecentMentions(limit = 50): Promise<AmplificationMention[]> {
  const cutoff = new Date(
    Date.now() - AMPLIFICATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();
  return db.many<AmplificationMention>(
    `SELECT * FROM amplification_mentions
     WHERE scraped_at >= $1
     ORDER BY scraped_at DESC
     LIMIT $2`,
    [cutoff, limit]
  );
}

export async function getMentionsByPlatform(
  platform: string,
  limit = 100
): Promise<AmplificationMention[]> {
  const cutoff = new Date(
    Date.now() - AMPLIFICATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();
  return db.many<AmplificationMention>(
    `SELECT * FROM amplification_mentions
     WHERE platform = $1 AND scraped_at >= $2
     ORDER BY scraped_at DESC
     LIMIT $3`,
    [platform, cutoff, limit]
  );
}

export interface ClusterWithContext extends AmplificationCluster {
  mentions: AmplificationMention[];
  source_article: { id: number; title: string; url: string; topic: string } | null;
  tier: "trending" | "critical";
}

export async function getActiveClusters(): Promise<ClusterWithContext[]> {
  const list = await db.many<AmplificationCluster>(
    `SELECT * FROM amplification_clusters
     WHERE status = 'active'
     ORDER BY last_seen DESC`
  );
  if (list.length === 0) return [];

  const ids = list
    .map((c) => c.id)
    .filter((x): x is number => typeof x === "number");
  const mentions =
    ids.length === 0
      ? []
      : await db.many<AmplificationMention>(
          `SELECT * FROM amplification_mentions
           WHERE cluster_id = ANY($1::bigint[])
           ORDER BY scraped_at DESC`,
          [ids]
        );

  const byCluster = new Map<number, AmplificationMention[]>();
  for (const m of mentions) {
    if (m.cluster_id == null) continue;
    const arr = byCluster.get(m.cluster_id) || [];
    arr.push(m);
    byCluster.set(m.cluster_id, arr);
  }

  const articleIds = Array.from(
    new Set(
      list
        .map((c) => c.kompas_article_id)
        .filter((x): x is number => typeof x === "number")
    )
  );
  const articleMap = new Map<
    number,
    { id: number; title: string; url: string; topic: string }
  >();
  if (articleIds.length > 0) {
    const articles = await db.many<{
      id: number;
      title: string;
      url: string;
      topic: string;
    }>(
      `SELECT id, title, url, topic FROM articles
       WHERE id = ANY($1::bigint[])`,
      [articleIds]
    );
    for (const a of articles) {
      articleMap.set(a.id, a);
    }
  }

  return list.map((c) => ({
    ...c,
    mentions: (c.id ? byCluster.get(c.id) : undefined) || [],
    source_article: c.kompas_article_id
      ? articleMap.get(c.kompas_article_id) || null
      : null,
    tier: (c.mention_count >= CRITICAL_MIN_MENTIONS ? "critical" : "trending") as
      | "trending"
      | "critical",
  }));
}
