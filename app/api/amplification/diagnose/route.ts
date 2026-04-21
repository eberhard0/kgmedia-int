import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return "invalid-url";
    }
  })();

  const admin = getSupabaseAdmin();
  const mentionsResult = await admin
    .from("amplification_mentions")
    .select("id")
    .limit(1);
  const clustersResult = await admin
    .from("amplification_clusters")
    .select("id")
    .limit(1);

  return Response.json({
    supabase_host: host,
    project_ref: host.split(".")[0],
    amplification_mentions: {
      ok: !mentionsResult.error,
      error: mentionsResult.error?.message || null,
    },
    amplification_clusters: {
      ok: !clustersResult.error,
      error: clustersResult.error?.message || null,
    },
  });
}
