// Apify integration — dormant until APIFY_TOKEN is set in the environment.
// When active, fetches posts from TikTok, Instagram, Threads, Facebook, and
// X/Twitter via maintained Apify actors and returns normalized RawMentions
// the amplification pipeline can merge alongside Google News / Reddit data.

export interface ApifyRawMention {
  url: string;
  platform: string;
  source: string;
  title: string;
  snippet: string;
  published_at: string | null;
  trigger_query: string;
  kompas_article_id?: number | null;
  triggered_entity?: string;
}

export interface EntityWatchInput {
  entity: string;
  articleId: number;
}

export function isApifyEnabled(): boolean {
  return !!process.env.APIFY_TOKEN;
}

interface ApifyActorInput {
  [key: string]: unknown;
}

async function runActor(actorId: string, input: ApifyActorInput): Promise<unknown[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      console.warn(`Apify ${actorId} returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Apify ${actorId} threw:`, err);
    return [];
  }
}

function truncate(s: string | undefined | null, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) : s;
}

// ---------- TikTok (clockworks/free-tiktok-scraper) ----------
interface TikTokItem {
  webVideoUrl?: string;
  authorMeta?: { name?: string; nickName?: string };
  text?: string;
  createTimeISO?: string;
}

export async function searchTikTok(
  keywords: string[],
  resultsPerPage = 10
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled() || keywords.length === 0) return [];
  const items = (await runActor("clockworks/free-tiktok-scraper", {
    hashtags: keywords,
    resultsPerPage,
  })) as TikTokItem[];
  return items
    .filter((i) => i.webVideoUrl)
    .map((i) => ({
      url: i.webVideoUrl!,
      platform: "tiktok",
      source: i.authorMeta?.name || i.authorMeta?.nickName || "",
      title: truncate(i.text, 200) || "(TikTok post)",
      snippet: truncate(i.text, 500),
      published_at: i.createTimeISO || null,
      trigger_query: `TikTok: ${keywords.join(", ")}`,
    }));
}

// ---------- Instagram (apify/instagram-scraper) ----------
interface InstagramItem {
  url?: string;
  shortCode?: string;
  ownerUsername?: string;
  caption?: string;
  timestamp?: string;
  type?: string;
}

function keywordsToHashtagUrls(keywords: string[], max = 4): string[] {
  return keywords
    .map((k) => k.toLowerCase().replace(/[^a-z0-9_]/g, ""))
    .filter((k) => k.length >= 3 && k.length <= 30)
    .slice(0, max)
    .map((t) => `https://www.instagram.com/explore/tags/${t}/`);
}

export async function searchInstagram(
  keywords: string[],
  resultsLimit = 10
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled() || keywords.length === 0) return [];
  const directUrls = keywordsToHashtagUrls(keywords);
  if (directUrls.length === 0) return [];
  const items = (await runActor("apify/instagram-scraper", {
    directUrls,
    resultsType: "posts",
    resultsLimit,
  })) as InstagramItem[];
  return items
    .map((i) => {
      const url = i.url || (i.shortCode ? `https://www.instagram.com/p/${i.shortCode}/` : "");
      return { url, item: i };
    })
    .filter(({ url }) => url.length > 0)
    .map(({ url, item }) => ({
      url,
      platform: "instagram",
      source: item.ownerUsername || "",
      title: truncate(item.caption, 200) || `(Instagram ${item.type || "post"})`,
      snippet: truncate(item.caption, 500),
      published_at: item.timestamp || null,
      trigger_query: `Instagram: ${keywords.join(", ")}`,
    }));
}

// ---------- Threads (curious-coder/threads-scraper) ----------
interface ThreadsItem {
  url?: string;
  user?: { username?: string };
  text?: string;
  publishedOn?: string;
}

export async function searchThreads(
  keywords: string[],
  resultsLimit = 20
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled() || keywords.length === 0) return [];
  const items = (await runActor("curious-coder/threads-scraper", {
    query: keywords.join(" "),
    resultsLimit,
  })) as ThreadsItem[];
  return items
    .filter((i) => i.url)
    .map((i) => ({
      url: i.url!,
      platform: "threads",
      source: i.user?.username || "",
      title: truncate(i.text, 200) || "(Threads post)",
      snippet: truncate(i.text, 500),
      published_at: i.publishedOn || null,
      trigger_query: `Threads: ${keywords.join(", ")}`,
    }));
}

// ---------- Facebook (apify/facebook-posts-scraper) ----------
interface FacebookItem {
  url?: string;
  user?: { name?: string };
  text?: string;
  time?: string;
}

export async function searchFacebook(
  pageUrls: string[],
  resultsLimit = 10
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled() || pageUrls.length === 0) return [];
  const items = (await runActor("apify/facebook-posts-scraper", {
    startUrls: pageUrls.map((u) => ({ url: u })),
    resultsLimit,
  })) as FacebookItem[];
  return items
    .filter((i) => i.url)
    .map((i) => ({
      url: i.url!,
      platform: "facebook",
      source: i.user?.name || "",
      title: truncate(i.text, 200) || "(Facebook post)",
      snippet: truncate(i.text, 500),
      published_at: i.time || null,
      trigger_query: `Facebook: ${pageUrls.length} pages`,
    }));
}

// ---------- X / Twitter (apidojo/twitter-scraper-lite) ----------
interface TwitterItem {
  url?: string;
  author?: { userName?: string };
  text?: string;
  createdAt?: string;
}

export async function searchTwitter(
  query: string,
  maxItems = 15
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled() || !query) return [];
  const items = (await runActor("apidojo/twitter-scraper-lite", {
    searchTerms: [query],
    maxItems,
  })) as TwitterItem[];
  return items
    .filter((i) => i.url)
    .map((i) => ({
      url: i.url!,
      platform: "twitter",
      source: i.author?.userName || "",
      title: truncate(i.text, 200) || "(tweet)",
      snippet: truncate(i.text, 500),
      published_at: i.createdAt || null,
      trigger_query: `X: ${query}`,
    }));
}

// ---------- Orchestrator ----------
// Threads has no maintained free Apify actor; that one stays disabled below.
// apidojo/twitter-scraper-lite is paid pay-per-use — calls return demo
// placeholders unless the actor is rented on the Apify account. Demo objects
// have no `url` field and get filtered out, so calling it without a rental
// is wasteful but not harmful.

export async function runAllApifySearches(
  keywords: string[],
  facebookPages: string[]
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled()) return [];
  const results = await Promise.all([
    searchTikTok(keywords).catch(() => []),
    searchInstagram(keywords).catch(() => []),
    searchFacebook(facebookPages).catch(() => []),
    searchTwitter(keywords.join(" OR ")).catch(() => []),
  ]);
  return results.flat();
}

// Entity-driven orchestrator. For each entity extracted from a Kompas
// article, fan out social searches across all platforms; preserves the
// article + entity attribution on every returned mention.
export async function runEntityApifySearches(
  watches: EntityWatchInput[],
  facebookPages: string[],
  brandKeywords: string[] = ["hariankompas", "kompascom", "kompastv", "kompasiana", "kompas.com", "kompas.id"]
): Promise<ApifyRawMention[]> {
  if (!isApifyEnabled()) return [];

  // Brand-anchored search: each unique entity, combined with brand context
  const allEntities = Array.from(new Set(watches.map((w) => w.entity))).slice(0, 20);
  const entityToArticleId = new Map<string, number>();
  for (const w of watches) {
    if (!entityToArticleId.has(w.entity)) {
      entityToArticleId.set(w.entity, w.articleId);
    }
  }

  // For per-platform searches we batch entities into single calls where
  // the actor supports multi-keyword input, then attribute each result
  // back to the entity whose name appears in the post text.
  const tagPerEntity = (mentions: ApifyRawMention[]): ApifyRawMention[] => {
    return mentions.map((m) => {
      const haystack = `${m.title} ${m.snippet}`.toLowerCase();
      let bestEntity = "";
      let bestArticleId: number | null = null;
      for (const e of allEntities) {
        if (haystack.includes(e.toLowerCase())) {
          bestEntity = e;
          bestArticleId = entityToArticleId.get(e) ?? null;
          break;
        }
      }
      return {
        ...m,
        triggered_entity: bestEntity,
        kompas_article_id: bestArticleId,
      };
    });
  };

  const tikTokKeywords = [...brandKeywords, ...allEntities];
  const igKeywords = [...brandKeywords, ...allEntities];
  // Twitter / X search uses the actor's searchTerms — pass a single OR-joined
  // brand-anchored query. Returns demo placeholders unless the apidojo
  // actor is rented in the Apify account; demo objects lack a `url` field
  // and get filtered out, so an unrented actor is harmless (just empty).
  const twitterQuery = brandKeywords.join(" OR ");

  const results = await Promise.all([
    searchTikTok(tikTokKeywords).then(tagPerEntity).catch(() => []),
    searchInstagram(igKeywords).then(tagPerEntity).catch(() => []),
    searchFacebook(facebookPages).then(tagPerEntity).catch(() => []),
    searchTwitter(twitterQuery).then(tagPerEntity).catch(() => []),
  ]);
  return results.flat();
}
