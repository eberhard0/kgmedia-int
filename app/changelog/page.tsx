import Link from "next/link";

export default function Changelog() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-4">
          Changelog
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          KG Media Internal Prediction Algo version history
        </p>
      </div>

      <div className="space-y-6">
        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.2.0</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Drill-down for mentions: who said it, where, and what. Platform tiles
            on the amplification page are now clickable — click a tile (e.g.
            TikTok / Reddit / Instagram) to open a panel showing up to 100 of
            that platform&apos;s last-24h mentions, with author, timestamp,
            triggered entity, post snippet, and a direct link to the original
            post. Click again to close. The cluster &ldquo;+ details&rdquo;
            view also got richer — each mention now shows the post snippet
            below the title and the author name in bolder text, so you can
            see at a glance what each source actually said.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.6</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added a per-platform breakdown line to the amplification scan SSE
            (e.g. <code className="bg-slate-700 px-1 rounded">Apify breakdown: tiktok=300, facebook=58, instagram=42</code>),
            so the &ldquo;Scan Now&rdquo; progress messages now show exactly which
            actors contributed how many posts. Lets us spot a silent actor without
            digging through server logs. Also corrected the stale &ldquo;fetching
            TikTok/IG/Threads/FB/X posts&rdquo; message — Threads and X aren&apos;t
            in the active orchestrator anymore.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.5</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Apify integration cleanup. Diagnosed three actors that had been
            silently returning zero: the Threads scraper had been delisted (404),
            Instagram&apos;s input schema had changed (400 on the old{" "}
            <code className="bg-slate-700 px-1 rounded">search</code>+{" "}
            <code className="bg-slate-700 px-1 rounded">searchType</code> shape),
            and the Twitter actor was returning{" "}
            <code className="bg-slate-700 px-1 rounded">{"{demo:true}"}</code>{" "}
            placeholders because it&apos;s now a paid pay-per-use rental.
            Rewrote Instagram to use{" "}
            <code className="bg-slate-700 px-1 rounded">directUrls</code> over
            hashtag pages (now returning real posts), and removed Threads + X /
            Twitter from the active orchestrator and platform tiles to stop
            wasting Apify compute. Both functions stay in{" "}
            <code className="bg-slate-700 px-1 rounded">lib/apify.ts</code> for
            easy re-enable if a working actor becomes available.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.4</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Stopped the Active Clusters section from pulsing. The alert banner at
            the top of the amplification page still pulses (it&apos;s small and
            quickly scannable), but the cluster card grid now keeps a static red
            border so the substantive text inside each card stays readable.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.3</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Switched the optional AI integrations from OpenAI to Claude (entity
            extraction, model claude-haiku-4-5) and Voyage AI (semantic clustering,
            model voyage-3-lite). Claude produces cleaner Indonesian-language
            entity names; Voyage handles multilingual embeddings cheaply and is
            Anthropic&apos;s recommended embedding partner. Lowered the cluster
            similarity threshold from 0.75 to 0.65 to match Voyage&apos;s scoring
            distribution, and added input chunking so scans with 1000+ mentions
            no longer exceed the embedding API&apos;s per-request batch cap.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.2</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Amplification UX. Moved the pulsing red ring off the whole page and onto just the Active Clusters card grid, so it&apos;s clear which part is alerting. Added a 🔔 Mute alerts toggle (persisted per browser via localStorage) that silences the pulse on both the dashboard and the amplification page without hiding the alerts themselves. New FAQ section explains what an active cluster is, the 3 mentions / 3 sources threshold, how to read a cluster card, and what to do when one fires.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.1</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Bug fix: amplification queries against Supabase were silently capped at 1000 rows, hiding TikTok and Facebook tiles and breaking cluster detection whenever 24h volume exceeded that limit. Raised the row limit on the dedupe lookup, clustering query, and stats query. With Apify enabled the dashboard now sees the full ~1500/day mention volume instead of just the first 1000.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.1.0</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Amplification page redesign. Replaced the long expand-collapse list with a scannable layout: a 7-tile platform grid (Google News, Reddit, X, TikTok, Instagram, Threads, Facebook) showing per-platform mention count, top entity, and a 24h sparkline; a stacked-bar timeline coloring each hour by platform; and active clusters as a 2-column card grid with optional expand-for-details. Latest mentions kept as a compact list at the bottom.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.10</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Headline panel clarity fix. Per-article sentiment scores are now labeled &quot;article&quot; so they are not confused with the topic slope. When a topic is ESCALATING or CRITICAL the sample headlines are sorted with the most negative ones first (most positive first when DE-ESCALATING) so the reason for the trend is immediately visible.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.9</span>
            <span className="text-xs text-slate-500">April 25, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Entity-driven amplification monitoring. Each scan now extracts named entities from recent Kompas.com / Kompas.id / Kompas TV / Kontan articles and watches every platform for those entities being discussed in connection with Kompas. Each cluster on the dashboard now shows the source Kompas article that triggered it and the specific entity being amplified. AI entity extraction activates automatically when OpenAI is wired up.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.8</span>
            <span className="text-xs text-slate-500">April 21, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added Amplification Watch — a new page that detects when 3+ external sources (Google News, Reddit) mention the same Kompas-related controversy within 24h. The main dashboard pulses red and shows an alert banner whenever a cluster is active. Free-tier only: TikTok/Instagram/Threads/Facebook posts still require paid scrapers.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.7</span>
            <span className="text-xs text-slate-500">April 21, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Removed Kompas.id ePaper (Print Edition) from tracking — the daily print fetch was slow and blocked interactive scans. Loading state now reads &quot;Loading Algo Data...&quot;.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.6</span>
            <span className="text-xs text-slate-500">April 21, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added per-platform social monitoring for Threads, Instagram, TikTok, and Facebook. Each card shows which business units are tracked — @hariankompas, @kompascom, @kompastv, @kompasiana — via Google News site-filtered feeds. The existing Twitter/X box is unchanged.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.5</span>
            <span className="text-xs text-slate-500">April 17, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added IndoBERT for Bahasa Indonesia headlines with automatic language detection — FinBERT handles English, IndoBERT handles Indonesian.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.4</span>
            <span className="text-xs text-slate-500">April 17, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Expanded FAQ with detailed column explanations including slope velocity, trend classification thresholds, and FinBERT scoring methodology.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.3</span>
            <span className="text-xs text-slate-500">April 17, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Enabled FinBERT transformer model for more accurate geopolitical sentiment analysis via Hugging Face API.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.2</span>
            <span className="text-xs text-slate-500">April 17, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added clickable article links with source and sentiment score so editorial can verify headlines directly.
          </p>
        </div>

        <div className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-blue-400 font-bold">v1.0.1</span>
            <span className="text-xs text-slate-500">April 16, 2026</span>
          </div>
          <p className="text-sm text-slate-300">
            Added real-time scan progress bar with live topic tracking, Truth Social monitoring, and FAQ page.
          </p>
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-slate-600">
        &copy; Eberhard Ojong 2026 | KG Media Geopolitical Radar
      </div>
    </main>
  );
}
