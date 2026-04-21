import { getActiveClusters, getRecentMentions } from "@/lib/amplification";

export const dynamic = "force-dynamic";

export async function GET() {
  const [clusters, recent] = await Promise.all([
    getActiveClusters(),
    getRecentMentions(50),
  ]);
  return Response.json({
    updated_at: new Date().toISOString(),
    alert_count: clusters.length,
    clusters,
    recent,
  });
}
