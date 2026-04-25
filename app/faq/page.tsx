import Link from "next/link";

export default function FAQ() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
          &larr; Back to Dashboard
        </Link>
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

      {/* Amplification Watch */}
      <section id="amplification" className="mb-10">
        <h2 className="text-lg font-bold text-slate-200 mb-4 border-b border-slate-700 pb-2">
          Amplification Watch
        </h2>
        <div className="text-sm text-slate-300 space-y-3">
          <p>
            The{" "}
            <a href="/amplification" className="text-blue-400 hover:text-blue-300 underline">
              Amplification page
            </a>{" "}
            answers a different question from the main dashboard. Instead of{" "}
            <em>&ldquo;is sentiment turning negative on a topic?&rdquo;</em> it asks{" "}
            <em>
              &ldquo;is a Kompas story being picked up and discussed across multiple
              external platforms simultaneously?&rdquo;
            </em>{" "}
            That cross-platform pickup is the early signal that a story is going
            from a Kompas headline to a public controversy.
          </p>

          <h3 className="text-base font-semibold text-white mt-4">
            What is an Active Cluster?
          </h3>
          <p>
            A cluster is a group of mentions across Google News, Reddit, X / Twitter,
            TikTok, Instagram, Threads, and Facebook that all appear to be about the
            same Kompas-related story. An <span className="text-red-400 font-bold">active</span>{" "}
            cluster means it has crossed both thresholds in the last 24 hours:
          </p>
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <div className="text-red-400 font-bold text-lg">≥ 3 mentions</div>
              <div className="text-xs text-slate-400 mt-1">
                The story is being talked about, not just mentioned once.
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <div className="text-red-400 font-bold text-lg">≥ 3 distinct sources</div>
              <div className="text-xs text-slate-400 mt-1">
                Multiple independent platforms — not just three retweets of the same post.
              </div>
            </div>
          </div>
          <p>
            Both must be true. A single Reddit thread with 20 comments is not a
            cluster. Three independent posts on TikTok, Reddit, and X about the same
            Kompas story is.
          </p>

          <h3 className="text-base font-semibold text-white mt-4">
            How do I read a cluster card?
          </h3>
          <ul className="list-disc list-inside space-y-1 text-slate-300 ml-2">
            <li>
              <span className="text-white font-semibold">Entity</span> — the key
              proper noun the cluster is built around (e.g., a person, a location, a
              brand).
            </li>
            <li>
              <span className="text-white font-semibold">About</span> — the Kompas
              article that triggered the watch, with the topic it was filed under.
            </li>
            <li>
              <span className="text-white font-semibold">Keyword chips</span> — the
              shared tokens linking the mentions together. Useful for sanity-checking
              whether the cluster is real or a false positive.
            </li>
            <li>
              <span className="text-white font-semibold">N mentions · M sources</span>{" "}
              — total volume and how many distinct platforms / outlets it&apos;s spread
              across.
            </li>
            <li>
              <span className="text-white font-semibold">+ details</span> — expand to
              read every individual mention with its platform tag and a link to the
              original post.
            </li>
          </ul>

          <h3 className="text-base font-semibold text-white mt-4">
            What does the pulsing red border mean?
          </h3>
          <p>
            When at least one cluster is active, the Active Clusters section pulses
            red and the dashboard shows a clickable banner. This is meant to be hard
            to miss — by definition, an active cluster means a Kompas story has
            already crossed the threshold for editorial attention. Click{" "}
            <span className="text-slate-400 font-bold">🔔 Mute alerts</span> on the
            Amplification page to silence the pulse for your browser; the alerts
            stay visible but stop animating. Your preference is remembered locally.
          </p>

          <h3 className="text-base font-semibold text-white mt-4">
            What should I do when a cluster fires?
          </h3>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 ml-2">
            <li>Open the cluster, read the linked Kompas article, and skim a few of the external mentions to understand the angle each platform is taking.</li>
            <li>Decide whether the story warrants a follow-up, a clarification, or a desk note for editorial.</li>
            <li>If the cluster looks like a false positive (off-topic mentions sharing only a generic keyword), no action — clusters auto-resolve when their volume drops below threshold within 24h.</li>
          </ol>

          <h3 className="text-base font-semibold text-white mt-4">
            Where does the data come from?
          </h3>
          <p>
            Free tier sources: Google News RSS (45 Indonesian + English controversy
            keywords) and Reddit search across r/indonesia, r/indonesian, and
            general subreddits. When an{" "}
            <code className="bg-slate-700 px-1 rounded">APIFY_TOKEN</code> is
            configured, the system also pulls TikTok, Instagram, Threads, Facebook,
            and X/Twitter posts for the same entities. Without Apify, those tiles
            stay at zero.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-slate-600">
        &copy; Eberhard Ojong 2026 | KG Media Internal Prediction Algo{" "}
        <a href="/changelog" className="text-blue-400 hover:text-blue-300 underline">
          v1.1.2
        </a>{" "}
        | KG Media News
      </div>
    </main>
  );
}
