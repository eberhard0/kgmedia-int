import { TRACKED_TOPICS, ESCALATION_WINDOW_HOURS } from "@/lib/config";
import { scrapeTopic, insertArticles, getExistingUrls } from "@/lib/scraper";
import { computeTopicStats } from "@/lib/escalation";
import { db } from "@/lib/db";
import type { Article } from "@/lib/types";
import { isAuthorizedCronRequest, unauthorizedScanResponse } from "@/lib/cron-auth";

export const maxDuration = 300;

async function getRecentArticles(topic: string): Promise<Article[]> {
  const cutoff = new Date(
    Date.now() - ESCALATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  return db.many<Article>(
    `SELECT * FROM articles
     WHERE topic = $1 AND scraped_at >= $2
     ORDER BY scraped_at DESC`,
    [topic, cutoff]
  );
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) return unauthorizedScanResponse();
  const encoder = new TextEncoder();
  const total = TRACKED_TOPICS.length;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      }

      try {
        send({ type: "start", total });

        const seenUrls = await getExistingUrls();

        for (let i = 0; i < TRACKED_TOPICS.length; i++) {
          const topicConfig = TRACKED_TOPICS[i];

          send({
            type: "scanning",
            topic: topicConfig.name,
            current: i + 1,
            total,
            queries: topicConfig.queries,
          });

          const articles = await scrapeTopic(topicConfig, seenUrls);
          const inserted = await insertArticles(articles);

          const recentArticles = await getRecentArticles(topicConfig.name);
          const stats = computeTopicStats(recentArticles);

          await db.query(
            `INSERT INTO topic_snapshots
               (topic, avg_compound, article_count,
                positive_pct, negative_pct, neutral_pct, slope, trend)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              topicConfig.name,
              stats.avg_compound,
              stats.article_count,
              stats.positive_pct,
              stats.negative_pct,
              stats.neutral_pct,
              stats.slope,
              stats.trend,
            ]
          );

          send({
            type: "done",
            topic: topicConfig.name,
            current: i + 1,
            total,
            fetched: articles.length,
            inserted,
            trend: stats.trend,
          });
        }

        send({ type: "complete", scanned_at: new Date().toISOString() });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
