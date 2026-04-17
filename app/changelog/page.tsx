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
          KG Media Internal Radar version history
        </p>
      </div>

      <div className="space-y-6">
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
