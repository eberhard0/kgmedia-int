import { getActiveClusters } from "@/lib/amplification";

export const dynamic = "force-dynamic";

export async function GET() {
  const clusters = await getActiveClusters();
  return Response.json({
    updated_at: new Date().toISOString(),
    alert_count: clusters.length,
    clusters,
  });
}
