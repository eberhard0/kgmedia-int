import { TRACKED_TOPICS, ESCALATION_WINDOW_HOURS } from "@/lib/config";
import { scrapeTopic, insertArticles, getExistingUrls } from "@/lib/scraper";
import { computeTopicStats } from "@/lib/escalation";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 300;

async function getRecentArticles(topic: string) {
  const cutoff = new Date(
    Date.now() - ESCALATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const { data } = await getSupabaseAdmin()
    .from("articles")
    .select("*")
    .eq("topic", topic)
    .gte("scraped_at", cutoff)
    .order("scraped_at", { ascending: false });

  return data || [];
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const isCron = (request.headers.get("user-agent") || "").startsWith(
    "vercel-cron"
  );
  const topics = isCron
    ? TRACKED_TOPICS
    : TRACKED_TOPICS.filter((t) => t.type !== "kompas-epaper");
  const total = topics.length;

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

        for (let i = 0; i < topics.length; i++) {
          const topicConfig = topics[i];

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

          await getSupabaseAdmin().from("topic_snapshots").insert({
            topic: topicConfig.name,
            avg_compound: stats.avg_compound,
            article_count: stats.article_count,
            positive_pct: stats.positive_pct,
            negative_pct: stats.negative_pct,
            neutral_pct: stats.neutral_pct,
            slope: stats.slope,
            trend: stats.trend,
          });

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
