import {
  getActiveClusters,
  getRecentMentions,
  getAmplificationStats,
} from "@/lib/amplification";

export const dynamic = "force-dynamic";

export async function GET() {
  const [clusters, recent, stats] = await Promise.all([
    getActiveClusters(),
    getRecentMentions(50),
    getAmplificationStats(),
  ]);
  const critical_count = clusters.filter((c) => c.tier === "critical").length;
  const trending_count = clusters.filter((c) => c.tier === "trending").length;
  return Response.json({
    updated_at: new Date().toISOString(),
    // alert_count drives the red pulse on the dashboard — only critical-tier
    // clusters trigger that. Trending-tier shows up in lists without alerting.
    alert_count: critical_count,
    critical_count,
    trending_count,
    clusters,
    recent,
    stats,
  });
}
