import { TRACKED_TOPICS, ESCALATION_WINDOW_HOURS } from "@/lib/config";
import { computeTopicStats } from "@/lib/escalation";
import { db } from "@/lib/db";
import type { Article, TopicSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const cutoff = new Date(
    Date.now() - ESCALATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const topicsData = [];

  for (const topicConfig of TRACKED_TOPICS) {
    const articles = await db.many<Article>(
      `SELECT * FROM articles
       WHERE topic = $1 AND scraped_at >= $2
       ORDER BY scraped_at DESC`,
      [topicConfig.name, cutoff]
    );

    const stats = computeTopicStats(articles);

    const snapshots = await db.many<TopicSnapshot>(
      `SELECT * FROM topic_snapshots
       WHERE topic = $1
       ORDER BY snapshot_at DESC
       LIMIT 48`,
      [topicConfig.name]
    );

    topicsData.push({
      topic: topicConfig.name,
      platform: topicConfig.platform,
      handles: topicConfig.handles,
      stats,
      snapshots,
    });
  }

  return Response.json({
    updated_at: new Date().toISOString(),
    topics: topicsData,
  });
}
