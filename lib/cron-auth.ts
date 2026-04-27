// Cron authorization. Vercel automatically attaches
// `Authorization: Bearer ${CRON_SECRET}` to every cron invocation when
// CRON_SECRET is set on the project. Anything reaching this code path
// without that header is either a manual visitor or a bot — reject it
// so we never trigger paid scrapers (Apify) for unauthorized callers.
//
// To rotate: change CRON_SECRET in Vercel env, redeploy. No app-side
// change required.

export function isAuthorizedCronRequest(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Treat absence as fail-closed in production (never trigger scans
    // without an explicit secret) and fail-open locally so dev still
    // works without setup.
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${expected}`;
}

export function unauthorizedScanResponse(): Response {
  return new Response(
    JSON.stringify({
      error:
        "Unauthorized. This endpoint runs on a daily Vercel cron and is not callable from the public dashboard.",
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}
