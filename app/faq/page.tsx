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
              &ldquo;is anyone outside KG Media talking about a KG Media brand right
              now?&rdquo;
            </em>{" "}
            Every mention stored on this page comes from someone other than KG
            Media itself — a TikTok user, a Reddit thread, a news outlet — and
            explicitly names one of our brands.
          </p>

          <h3 className="text-base font-semibold text-white mt-4">
            Brand filter — which mentions count?
          </h3>
          <p>
            We only store posts whose title or caption explicitly names one of:{" "}
            <code className="bg-slate-700 px-1 rounded">kompas</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">kompas.com</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">kompas.id</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">hariankompas</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">kompastv</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">kompasiana</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">kontan</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">gramedia</code>,{" "}
            <code className="bg-slate-700 px-1 rounded">santika</code>. Anything
            else gets dropped — even if it&apos;s about a topic Kompas covered, if
            the post doesn&apos;t name a brand it isn&apos;t amplification of KG
            Media. The scan progress shows how many were dropped per run.
          </p>

          <h3 className="text-base font-semibold text-white mt-4">
            Two tiers — Trending and Critical
          </h3>
          <p>
            Mentions are grouped into clusters (multiple posts about the same
            angle / same brand). A cluster surfaces only when at least{" "}
            <span className="text-yellow-400 font-bold">10 mentions from 3
            distinct sources</span> have come in within 24 hours. Below that, the
            mentions exist in the database (and show up in the platform-tile
            drill-downs) but no cluster card appears.
          </p>
          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
              <div className="text-yellow-400 font-bold text-lg">Trending</div>
              <div className="text-xs text-slate-400 mt-1">
                10–99 mentions, ≥3 sources. Watch list — story is climbing but
                not yet a public-facing alert. No pulse, no banner.
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded p-3">
              <div className="text-red-400 font-bold text-lg">Critical</div>
              <div className="text-xs text-slate-400 mt-1">
                100+ mentions, ≥3 sources. Real public conversation around a KG
                brand. Red border + pulsing banner on dashboard and amplification
                page.
              </div>
            </div>
          </div>
          <p>
            The 3-source requirement is the same on both tiers: 100 reposts of
            one viral TikTok still counts as one source. A genuine cross-platform
            conversation is what we&apos;re trying to catch.
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
            Pulsing fires <span className="font-semibold text-white">only</span>{" "}
            on Critical-tier clusters (100+ mentions, 3+ sources). When at least
            one Critical cluster exists, that section&apos;s border pulses red
            and the main dashboard shows a clickable banner. Trending-tier
            clusters never pulse — they&apos;re for situational awareness, not
            alerting. Click{" "}
            <span className="text-slate-400 font-bold">🔔 Mute alerts</span> on
            the Amplification page to silence the pulse for your browser; the
            alerts stay visible but stop animating. Your preference is remembered
            locally.
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
            general subreddits. With an{" "}
            <code className="bg-slate-700 px-1 rounded">APIFY_TOKEN</code> the
            system also pulls TikTok, Instagram, Facebook, and X / Twitter posts
            for the same entities. The X actor (<code className="bg-slate-700 px-1 rounded">apidojo/twitter-scraper-lite</code>)
            is a <span className="font-semibold">paid Apify rental</span> on top
            of the base APIFY_TOKEN — without an active rental, the actor
            returns demo placeholders that get silently dropped, so the X tile
            stays at zero. Threads is{" "}
            <span className="text-slate-400 italic">not currently covered</span>{" "}
            — there is no maintained free Threads actor on Apify.
          </p>
          <p>
            Two optional AI providers improve quality when their keys are present:{" "}
            <code className="bg-slate-700 px-1 rounded">ANTHROPIC_API_KEY</code>{" "}
            (Claude Haiku, used for entity extraction — produces clean
            Indonesian-language entity names like &ldquo;Madinah&rdquo; or
            &ldquo;Bandara Halim&rdquo; rather than capitalized-token noise) and{" "}
            <code className="bg-slate-700 px-1 rounded">VOYAGE_API_KEY</code>{" "}
            (Voyage AI <code className="bg-slate-700 px-1 rounded">voyage-3-lite</code>{" "}
            embeddings, used for semantic clustering — catches &ldquo;same story
            across platforms&rdquo; that keyword overlap would miss). Without these,
            the system falls back to a heuristic entity extractor and Jaccard
            keyword clustering — still functional, just slightly noisier.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 text-center text-xs text-slate-600">
        &copy; Eberhard Ojong 2026 | KG Media Internal Prediction Algo{" "}
        <a href="/changelog" className="text-blue-400 hover:text-blue-300 underline">
          v1.3.5
        </a>{" "}
        | KG Media News
      </div>
    </main>
  );
}
