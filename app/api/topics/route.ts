import { TRACKED_TOPICS, ESCALATION_WINDOW_HOURS } from "@/lib/config";
import { computeTopicStats } from "@/lib/escalation";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const cutoff = new Date(
    Date.now() - ESCALATION_WINDOW_HOURS * 3600 * 1000
  ).toISOString();

  const topicsData = [];

  for (const topicConfig of TRACKED_TOPICS) {
    const { data: articles } = await getSupabase()
      .from("articles")
      .select("*")
      .eq("topic", topicConfig.name)
      .gte("scraped_at", cutoff)
      .order("scraped_at", { ascending: false });

    const stats = computeTopicStats(articles || []);

    const { data: snapshots } = await getSupabase()
      .from("topic_snapshots")
      .select("*")
      .eq("topic", topicConfig.name)
      .order("snapshot_at", { ascending: false })
      .limit(48);

    topicsData.push({
      topic: topicConfig.name,
      platform: topicConfig.platform,
      handles: topicConfig.handles,
      stats,
      snapshots: snapshots || [],
    });
  }

  return Response.json({
    updated_at: new Date().toISOString(),
    topics: topicsData,
  });
}
