import Parser from "rss-parser";
import { getFeedUrls } from "./feeds";
import { analyzeSentiment } from "./sentiment";
import { getSupabaseAdmin, type Article } from "./supabase";
import { NUM_ARTICLES_PER_FEED, FETCH_DELAY_MS } from "./config";

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  },
});

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface KompasEpaperArticle {
  headline?: string;
  title?: string;
  permalink?: string;
  excerpt?: string;
  publishedDate?: string;
  page?: number;
}

async function fetchKompasEpaper(topicName: string, seenUrls: Set<string>): Promise<Article[]> {
  const today = new Date();
  const dateStr =
    today.getUTCFullYear().toString() +
    String(today.getUTCMonth() + 1).padStart(2, "0") +
    String(today.getUTCDate()).padStart(2, "0");

  const articles: Article[] = [];
  const seenTitles = new Set<string>();

  // Fetch all pages (typically 1-24 for daily edition)
  for (let page = 1; page <= 24; page++) {
    try {
      const res = await fetch(
        `https://cds.kompas.id/api/v2/article/print/${dateStr}?printpage=${page}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) break;
      const data = await res.json();
      const results: KompasEpaperArticle[] = data.result || [];

      if (results.length === 0) break;

      for (const item of results) {
        const title = (item.headline || item.title || "").trim();
        if (!title) continue;

        const norm = normalizeTitle(title);
        if (seenTitles.has(norm)) continue;
        seenTitles.add(norm);

        const link = item.permalink || "";
        if (!link || seenUrls.has(link)) continue;
        seenUrls.add(link);

        const sentiment = await analyzeSentiment(title);
        articles.push({
          topic: topicName,
          title,
          url: link,
          source: `Kompas.id ePaper p${item.page || page}`,
          published_at: item.publishedDate
            ? new Date(item.publishedDate).toISOString()
            : null,
          ...sentiment,
        });
      }
    } catch {
      break;
    }

    await sleep(500);
  }

  return articles;
}

export async function scrapeTopic(
  topicConfig: { name: string; queries: string[]; directFeeds?: string[]; type?: string },
  seenUrls: Set<string>
): Promise<Article[]> {
  if (topicConfig.type === "kompas-epaper") {
    return fetchKompasEpaper(topicConfig.name, seenUrls);
  }

  const searchFeeds = getFeedUrls(topicConfig.queries);
  const directFeeds = topicConfig.directFeeds || [];
  const feedUrls = [...directFeeds, ...searchFeeds];
  const seenTitles = new Set<string>();
  const articles: Article[] = [];

  for (const url of feedUrls) {
    try {
      const feed = await parser.parseURL(url);
      const items = feed.items.slice(0, NUM_ARTICLES_PER_FEED);

      for (const item of items) {
        const title = (item.title || "").trim();
        if (!title) continue;

        const norm = normalizeTitle(title);
        if (seenTitles.has(norm)) continue;
        seenTitles.add(norm);

        const link = item.link || "";
        if (!link || seenUrls.has(link)) continue;
        seenUrls.add(link);

        const sentiment = await analyzeSentiment(title);

        articles.push({
          topic: topicConfig.name,
          title,
          url: link,
          source: item.creator || new URL(link).hostname,
          published_at: item.isoDate || null,
          ...sentiment,
        });
      }
    } catch {
      // Feed fetch failed, continue with others
    }

    await sleep(FETCH_DELAY_MS);
  }

  return articles;
}

export async function insertArticles(articles: Article[]): Promise<number> {
  if (articles.length === 0) return 0;

  const { data, error } = await getSupabaseAdmin()
    .from("articles")
    .upsert(articles, { onConflict: "url", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("Insert error:", error.message);
    return 0;
  }

  return data?.length || 0;
}

export async function getExistingUrls(): Promise<Set<string>> {
  const { data } = await getSupabaseAdmin()
    .from("articles")
    .select("url")
    .gte(
      "scraped_at",
      new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    );

  return new Set((data || []).map((r: { url: string }) => r.url));
}
