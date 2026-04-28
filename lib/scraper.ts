import Parser from "rss-parser";
import { getFeedUrls } from "./feeds";
import { analyzeSentiment } from "./sentiment";
import { db } from "./db";
import type { Article } from "./types";
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

export async function scrapeTopic(
  topicConfig: { name: string; queries: string[]; directFeeds?: string[] },
  seenUrls: Set<string>
): Promise<Article[]> {
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

  // Build a multi-row INSERT ... ON CONFLICT (url) DO NOTHING RETURNING id.
  // Parameterize every value so unsanitized titles can't inject SQL.
  const cols = [
    "topic", "title", "url", "source", "published_at",
    "compound_score", "pos_score", "neg_score", "neu_score",
    "sentiment_label", "analyzer",
  ];
  const valuesSql: string[] = [];
  const params: unknown[] = [];
  for (const a of articles) {
    const start = params.length;
    params.push(
      a.topic, a.title, a.url, a.source, a.published_at,
      a.compound_score, a.pos_score, a.neg_score, a.neu_score,
      a.sentiment_label, a.analyzer
    );
    valuesSql.push(
      `(${cols.map((_, i) => `$${start + i + 1}`).join(", ")})`
    );
  }
  const sql = `
    INSERT INTO articles (${cols.join(", ")})
    VALUES ${valuesSql.join(", ")}
    ON CONFLICT (url) DO NOTHING
    RETURNING id
  `;
  try {
    const { rowCount } = await db.query(sql, params);
    return rowCount || 0;
  } catch (err) {
    console.error("Insert error:", err instanceof Error ? err.message : err);
    return 0;
  }
}

export async function getExistingUrls(): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const rows = await db.many<{ url: string }>(
    `SELECT url FROM articles WHERE scraped_at >= $1`,
    [cutoff]
  );
  return new Set(rows.map((r) => r.url));
}
