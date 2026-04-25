"use client";

import { useEffect, useState, useCallback } from "react";

interface TopicStats {
  avg_compound: number;
  article_count: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  slope: number;
  trend: string;
  sample_headlines: Array<{ title: string; url: string; source: string; score: number }>;
}

interface TopicData {
  topic: string;
  platform?: string;
  handles?: string[];
  stats: TopicStats;
}

interface ApiResponse {
  updated_at: string;
  topics: TopicData[];
}

const TREND_CONFIG: Record<
  string,
  { color: string; bg: string; icon: string }
> = {
  CRITICAL: { color: "text-red-400", bg: "bg-red-500/10", icon: "!!!" },
  ESCALATING: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    icon: "!!",
  },
  "DE-ESCALATING": {
    color: "text-green-400",
    bg: "bg-green-500/10",
    icon: "++",
  },
  STABLE: { color: "text-slate-400", bg: "bg-slate-500/10", icon: "--" },
  "NO DATA": { color: "text-slate-600", bg: "bg-slate-500/5", icon: "??" },
};

function trendArrow(slope: number): string {
  if (slope <= -0.1) return "▼▼▼";
  if (slope <= -0.05) return "▼▼";
  if (slope < -0.01) return "▼";
  if (slope >= 0.1) return "▲▲▲";
  if (slope >= 0.05) return "▲▲";
  if (slope > 0.01) return "▲";
  return "─";
}

function scoreColor(score: number): string {
  if (score > 0.05) return "text-green-400";
  if (score < -0.05) return "text-red-400";
  return "text-slate-300";
}

export default function Dashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [scanning, setScanning] = useState(false);
  const [amplificationAlerts, setAmplificationAlerts] = useState(0);
  const [muted, setMuted] = useState(false);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    topic: string;
    queries: string[];
    completed: Array<{ topic: string; fetched: number; inserted: number }>;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/topics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefresh(new Date());
      }
    } catch {
      // Retry on next interval
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerScan = async () => {
    setScanning(true);
    setScanProgress({ current: 0, total: 0, topic: "Initializing...", queries: [], completed: [] });

    try {
      const res = await fetch("/api/scan");
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      const completed: Array<{ topic: string; fetched: number; inserted: number }> = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;

          try {
            const event = JSON.parse(match[1]);

            if (event.type === "start") {
              setScanProgress((p) => p ? { ...p, total: event.total } : null);
            } else if (event.type === "scanning") {
              setScanProgress((p) => p ? {
                ...p,
                current: event.current,
                total: event.total,
                topic: event.topic,
                queries: event.queries || [],
                completed,
              } : null);
            } else if (event.type === "done") {
              completed.push({
                topic: event.topic,
                fetched: event.fetched,
                inserted: event.inserted,
              });
              setScanProgress((p) => p ? { ...p, completed: [...completed] } : null);
            } else if (event.type === "complete") {
              await fetchData();
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } finally {
      await fetchData();
      setScanning(false);
      setScanProgress(null);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    setMuted(localStorage.getItem("kg_amp_mute_v1") === "1");
    const onStorage = (e: StorageEvent) => {
      if (e.key === "kg_amp_mute_v1") setMuted(e.newValue === "1");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/amplification");
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setAmplificationAlerts(json.alert_count || 0);
      } catch {
        // ignore
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const alerts = (data?.topics || []).filter(
    (t) => t.stats.trend === "CRITICAL" || t.stats.trend === "ESCALATING"
  );

  const ampPulse = amplificationAlerts > 0 && !muted;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {amplificationAlerts > 0 && (
        <a
          href="/amplification"
          className={`block mb-6 border-2 border-red-500 bg-red-500/20 rounded-lg p-4 hover:bg-red-500/30 transition-colors ${
            ampPulse ? "animate-pulse" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-2xl">🚨</span>
              <div>
                <div className="text-red-300 font-bold uppercase tracking-wider">
                  {amplificationAlerts} Amplification Alert
                  {amplificationAlerts > 1 ? "s" : ""} Active
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  3+ external sources reporting on the same Kompas-related
                  topic. Click to review.
                </div>
              </div>
            </div>
            <span className="text-red-300 text-sm underline">Open →</span>
          </div>
        </a>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-blue-400">KG Media</span> Internal Prediction Algo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Internal Monitoring — News, Social Media, Forums
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            {scanning ? "Scanning..." : "Scan Now"}
          </button>
          <div className="text-right text-xs text-slate-500">
            <div>
              Last refresh:{" "}
              {lastRefresh.toLocaleTimeString("id-ID", {
                timeZone: "Asia/Jakarta",
              })}{" "}
              WIB
            </div>
            {data?.updated_at && (
              <div>
                Data:{" "}
                {new Date(data.updated_at).toLocaleString("id-ID", {
                  timeZone: "Asia/Jakarta",
                })}
              </div>
            )}
          </div>
          <div
            className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`}
          />
        </div>
      </div>

      {/* Scan Progress */}
      {scanning && scanProgress && (
        <div className="mb-6 border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-blue-400 font-bold text-sm uppercase tracking-wider">
              Scanning in Progress
            </h2>
            <span className="text-xs text-slate-400">
              {scanProgress.current} / {scanProgress.total} topics
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${scanProgress.total > 0 ? (scanProgress.current / scanProgress.total) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Current Topic */}
          <div className="mb-2">
            <span className="text-sm text-white font-semibold">
              {scanProgress.topic}
            </span>
            {scanProgress.queries.length > 0 && (
              <div className="text-xs text-slate-400 mt-1">
                Searching: {scanProgress.queries.map((q, i) => (
                  <span key={i}>
                    {i > 0 && " | "}
                    <span className="text-slate-300">{q}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Completed Topics */}
          {scanProgress.completed.length > 0 && (
            <div className="mt-3 space-y-1">
              {scanProgress.completed.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">&#10003;</span>
                  <span className="text-slate-300">{c.topic}</span>
                  <span className="text-slate-500">
                    {c.fetched} found, {c.inserted} new
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="mb-6 border border-red-500/30 bg-red-500/5 rounded-lg p-4">
          <h2 className="text-red-400 font-bold text-sm mb-3 uppercase tracking-wider">
            Active Alerts
          </h2>
          {alerts.map((a) => {
            const cfg = TREND_CONFIG[a.stats.trend];
            return (
              <div key={a.topic} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${cfg.color}`}>
                    [{cfg.icon}]
                  </span>
                  <span className="font-semibold">{a.topic}</span>
                  <span className={`text-sm ${cfg.color}`}>
                    slope {a.stats.slope > 0 ? "+" : ""}
                    {a.stats.slope.toFixed(4)}/hr
                  </span>
                  <span className="text-sm text-slate-500">
                    ({a.stats.article_count} articles)
                  </span>
                </div>
                {a.stats.sample_headlines.length > 0 && (
                  <div className="ml-8 mt-1 text-xs text-slate-400">
                    {a.stats.sample_headlines.slice(0, 2).map((h, i) => (
                      <div key={i} className="truncate">
                        -{" "}
                        <a
                          href={h.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 underline"
                        >
                          {h.title}
                        </a>
                        <span className="text-slate-600 ml-1">({h.source})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 uppercase text-xs tracking-wider">
              <th className="text-left p-3">Topic</th>
              <th className="text-center p-3">Avg Score</th>
              <th className="text-center p-3">Trend</th>
              <th className="text-center p-3">Slope</th>
              <th className="text-center p-3">Articles</th>
              <th className="text-center p-3">+%</th>
              <th className="text-center p-3">-%</th>
              <th className="text-center p-3">Alert</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-slate-500">
                  Loading Algo Data...
                </td>
              </tr>
            ) : (
              (data?.topics || []).map((t) => {
                const cfg =
                  TREND_CONFIG[t.stats.trend] || TREND_CONFIG.STABLE;
                return (
                  <tr
                    key={t.topic}
                    className={`border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors ${cfg.bg}`}
                  >
                    <td className="p-3 font-semibold">{t.topic}</td>
                    <td
                      className={`p-3 text-center font-mono ${scoreColor(t.stats.avg_compound)}`}
                    >
                      {t.stats.avg_compound > 0 ? "+" : ""}
                      {t.stats.avg_compound.toFixed(3)}
                    </td>
                    <td
                      className={`p-3 text-center font-bold ${cfg.color}`}
                    >
                      {t.stats.trend}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      {trendArrow(t.stats.slope)}{" "}
                      {t.stats.slope > 0 ? "+" : ""}
                      {t.stats.slope.toFixed(4)}/hr
                    </td>
                    <td className="p-3 text-center">
                      {t.stats.article_count}
                    </td>
                    <td className="p-3 text-center text-green-400">
                      {t.stats.positive_pct.toFixed(0)}%
                    </td>
                    <td className="p-3 text-center text-red-400">
                      {t.stats.negative_pct.toFixed(0)}%
                    </td>
                    <td
                      className={`p-3 text-center font-bold ${cfg.color}`}
                    >
                      {cfg.icon}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Headline Panels */}
      {data && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.topics.map((t) => {
            const cfg =
              TREND_CONFIG[t.stats.trend] || TREND_CONFIG.STABLE;
            return (
              <div
                key={t.topic}
                className="border border-slate-700/50 rounded-lg p-4 bg-slate-800/20"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{t.topic}</h3>
                  <span className={`text-xs font-bold ${cfg.color}`}>
                    {t.stats.trend}
                  </span>
                </div>
                {t.platform && t.handles && t.handles.length > 0 && (
                  <div className="mb-3 pb-2 border-b border-slate-700/40">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                      {t.platform} · tracking
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {t.handles.map((h) => (
                        <span
                          key={h}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-300 font-mono"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {t.stats.sample_headlines.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 pb-1">
                        <span className="shrink-0 w-10 text-right">article</span>
                        <span>headline</span>
                      </div>
                      {[...t.stats.sample_headlines]
                        .sort((a, b) => {
                          const trend = t.stats.trend;
                          if (trend === "CRITICAL" || trend === "ESCALATING") {
                            return a.score - b.score; // most negative first
                          }
                          if (trend === "DE-ESCALATING") {
                            return b.score - a.score; // most positive first
                          }
                          return 0;
                        })
                        .slice(0, 4)
                        .map((h, i) => {
                          const scoreColor =
                            h.score > 0.05
                              ? "text-green-500"
                              : h.score < -0.05
                                ? "text-red-500"
                                : "text-slate-600";
                          return (
                            <div key={i} className="flex items-start gap-1.5 text-xs">
                              <span
                                className={`${scoreColor} shrink-0 w-10 text-right font-mono`}
                                title="Per-article sentiment score (not the topic slope)"
                              >
                                {h.score > 0 ? "+" : ""}{h.score.toFixed(2)}
                              </span>
                              <a
                                href={h.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-400 underline truncate"
                                title={h.title}
                              >
                                {h.title}
                              </a>
                            </div>
                          );
                        })}
                    </>
                  ) : (
                    <p className="text-xs text-slate-600">
                      No recent articles
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-600">
        &copy; Eberhard Ojong 2026 | KG Media Internal Prediction Algo{" "}
        <a href="/changelog" className="text-blue-400 hover:text-blue-300 underline">
          v1.1.3
        </a>{" "}
        | Auto-refreshes every 30s | Cron scan daily |{" "}
        <a href="/amplification" className="text-blue-400 hover:text-blue-300 underline">
          Amplification
        </a>{" "}
        |{" "}
        <a href="/faq" className="text-blue-400 hover:text-blue-300 underline">
          FAQ
        </a>
      </div>
    </main>
  );
}
