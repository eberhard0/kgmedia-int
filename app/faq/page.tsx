export default function FAQ() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <a href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dashboard
        </a>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-4">
          <span className="text-blue-400">KG Media</span> Internal Prediction Algo — FAQ
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          How to read and use the dashboard
        </p>
      </div>

      {/* Main Table Columns */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          Dashboard Columns
        </h2>
        <div className="overflow-x-auto rounded-lg border border-slate-700/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 uppercase text-xs tracking-wider">
                <th className="text-left p-3">Column</th>
                <th className="text-left p-3">What it means</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              <tr className="border-t border-slate-700/30">
                <td className="p-3 font-semibold text-white">Topic</td>
                <td className="p-3">
                  The geopolitical subject being monitored (e.g., South China
                  Sea, Trade Policy, Truth Social).
                </td>
              </tr>
              <tr className="border-t border-slate-700/30 bg-slate-800/20">
                <td className="p-3 font-semibold text-white">Avg Score</td>
                <td className="p-3">
                  The average sentiment score across all articles in the last 24
                  hours. Ranges from{" "}
                  <span className="text-red-400">-1.0</span> (very negative) to{" "}
                  <span className="text-green-400">+1.0</span> (very positive).
                  Calculated by averaging the FinBERT score of every headline
                  for that topic.
                </td>
              </tr>
              <tr className="border-t border-slate-700/30">
                <td className="p-3 font-semibold text-white">Trend</td>
                <td className="p-3">
                  The current classification based on how fast sentiment is
                  changing:{" "}
                  <span className="text-slate-400 font-bold">STABLE</span> —
                  sentiment isn&apos;t moving significantly.{" "}
                  <span className="text-yellow-400 font-bold">ESCALATING</span>{" "}
                  — sentiment is getting worse at a notable rate.{" "}
                  <span className="text-red-400 font-bold">CRITICAL</span> —
                  sentiment is deteriorating very fast, something may be
                  unfolding.{" "}
                  <span className="text-green-400 font-bold">
                    DE-ESCALATING
                  </span>{" "}
                  — sentiment is improving, tensions may be easing.
                </td>
              </tr>
              <tr className="border-t border-slate-700/30 bg-slate-800/20">
                <td className="p-3 font-semibold text-white">Slope</td>
                <td className="p-3">
                  The speed and direction of sentiment change, measured in points
                  per hour. Think of it as the &quot;velocity&quot; of sentiment.
                  For example:{" "}
                  <code className="bg-slate-700 px-1 rounded">-0.08/hr</code>{" "}
                  means sentiment drops 0.08 points every hour — coverage is
                  turning more negative.{" "}
                  <code className="bg-slate-700 px-1 rounded">+0.03/hr</code>{" "}
                  means sentiment improves 0.03 points every hour.{" "}
                  <code className="bg-slate-700 px-1 rounded">0.0000/hr</code>{" "}
                  means sentiment is flat. Arrows visualize the slope: ▼▼▼
                  (falling fast), ▼ (falling slowly), ─ (flat), ▲ (rising
                  slowly), ▲▲▲ (rising fast). The slope is what determines the
                  Trend classification.
                </td>
              </tr>
              <tr className="border-t border-slate-700/30">
                <td className="p-3 font-semibold text-white">Articles</td>
                <td className="p-3">
                  Total number of news articles analyzed for this topic in the
                  last 24 hours.
                </td>
              </tr>
              <tr className="border-t border-slate-700/30 bg-slate-800/20">
                <td className="p-3 font-semibold text-white">+%</td>
                <td className="p-3">
                  Percentage of articles scored as positive (score above +0.05).
                </td>
              </tr>
              <tr className="border-t border-slate-700/30">
                <td className="p-3 font-semibold text-white">-%</td>
                <td className="p-3">
                  Percentage of articles scored as negative (score below -0.05).
                </td>
              </tr>
              <tr className="border-t border-slate-700/30 bg-slate-800/20">
                <td className="p-3 font-semibold text-white">Alert</td>
                <td className="p-3">
                  Quick visual indicator:{" "}
                  <span className="text-red-400 font-bold">!!!</span> =
                  CRITICAL,{" "}
                  <span className="text-yellow-400 font-bold">!!</span> =
                  ESCALATING,{" "}
                  <span className="text-slate-400 font-bold">--</span> = STABLE,{" "}
                  <span className="text-green-400 font-bold">++</span> =
                  DE-ESCALATING
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Editorial Workflow */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          Editorial Workflow
        </h2>
        <div className="space-y-3 text-sm text-slate-300">
          <div className="flex gap-3 items-start">
            <span className="text-yellow-400 font-bold text-lg leading-none mt-0.5">
              !!
            </span>
            <p>
              <span className="font-semibold text-white">ESCALATING</span> —
              Start pre-writing an article on that topic. Sentiment is trending
              negative and something may be developing.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-red-400 font-bold text-lg leading-none mt-0.5">
              !!!
            </span>
            <p>
              <span className="font-semibold text-white">CRITICAL</span> —
              Something big is likely unfolding. Get your draft publish-ready and
              monitor for confirmation.
            </p>
          </div>
          <div className="flex gap-3 items-start">
            <span className="text-green-400 font-bold text-lg leading-none mt-0.5">
              ++
            </span>
            <p>
              <span className="font-semibold text-white">DE-ESCALATING</span> —
              Tensions are easing. Consider a positive follow-up or resolution
              piece.
            </p>
          </div>
        </div>
      </section>

      {/* How Scores Work */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          How Sentiment Scores Work
        </h2>
        <div className="text-sm text-slate-300 space-y-3">
          <p>
            Each news headline is analyzed using two AI models based on
            language detection:{" "}
            <span className="font-semibold text-white">FinBERT</span> for
            English headlines (trained on financial and geopolitical text) and{" "}
            <span className="font-semibold text-white">IndoBERT</span> for
            Bahasa Indonesia headlines (trained on Indonesian text). The system
            automatically detects the language and routes to the correct model.
            Both replaced the earlier VADER analyzer for significantly better
            accuracy — they understand context, nuance, and domain-specific
            language that rule-based tools miss. The score ranges from -1.0 to
            +1.0:
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <div className="text-red-400 font-bold text-lg">-1.0 to -0.05</div>
              <div className="text-xs text-slate-400 mt-1">Negative</div>
            </div>
            <div className="bg-slate-500/10 border border-slate-500/30 rounded p-3">
              <div className="text-slate-300 font-bold text-lg">-0.05 to +0.05</div>
              <div className="text-xs text-slate-400 mt-1">Neutral</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded p-3">
              <div className="text-green-400 font-bold text-lg">+0.05 to +1.0</div>
              <div className="text-xs text-slate-400 mt-1">Positive</div>
            </div>
          </div>
          <p>
            The <span className="font-semibold text-white">slope</span> measures
            how the average score is changing over time. A negative slope means
            coverage is becoming more negative (potential escalation). Multiple
            scan cycles are needed before slopes become meaningful.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-slate-600">
        &copy; Eberhard Ojong 2026 | KG Media Internal Prediction Algo{" "}
        <a href="/changelog" className="text-blue-400 hover:text-blue-300 underline">
          v1.0.8
        </a>{" "}
        | KG Media News
      </div>
    </main>
  );
}
