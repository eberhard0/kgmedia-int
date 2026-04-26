import { getMentionsByPlatform } from "@/lib/amplification";

export const dynamic = "force-dynamic";

const ALLOWED_PLATFORMS = new Set([
  "google_news",
  "reddit",
  "tiktok",
  "instagram",
  "facebook",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = url.searchParams.get("platform") || "";
  const limitRaw = parseInt(url.searchParams.get("limit") || "100", 10);
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 100, 1), 500);

  if (!ALLOWED_PLATFORMS.has(platform)) {
    return Response.json(
      { error: "platform query param required and must be one of " + [...ALLOWED_PLATFORMS].join(", ") },
      { status: 400 }
    );
  }

  const mentions = await getMentionsByPlatform(platform, limit);
  return Response.json({
    platform,
    total: mentions.length,
    mentions,
  });
}
