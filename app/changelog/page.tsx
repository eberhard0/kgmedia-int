export default function Changelog() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dashboard
        </a>
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
