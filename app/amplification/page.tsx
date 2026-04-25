"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Mention {
  id: number;
  url: string;
  platform: string;
  source: string;
  title: string;
  snippet: string;
  published_at: string | null;
  scraped_at: string;
  trigger_query: string;
  kompas_article_id?: number | null;
  triggered_entity?: string;
}

interface SourceArticle {
  id: number;
  title: string;
  url: string;
  topic: string;
}

interface Cluster {
  id: number;
  keywords: string[];
  first_seen: string;
  last_seen: string;
  mention_count: number;
  source_count: number;
  status: string;
  mentions: Mention[];
  triggered_entity?: string;
  source_article: SourceArticle | null;
}

interface PlatformStat {
  platform: string;
  total: number;
  top_entity: string | null;
  hourly: number[];
}

interface Stats {
  platforms: PlatformStat[];
  timeline: {
    labels: string[];
    series: Record<string, number[]>;
    total_per_hour: number[];
  };
  total_mentions: number;
}

interface ApiResponse {
  updated_at: string;
  alert_count: number;
  clusters: Cluster[];
  recent: Mention[];
  stats: Stats;
}

interface PlatformMeta {
  label: string;
  color: string;        // tailwind text class
  hex: string;          // svg fill
  bg: string;           // tile bg tint
  border: string;       // tile border tint
  glyph: string;        // simple ASCII / unicode glyph
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  google_news: {
    label: "Google News",
    color: "text-blue-300",
    hex: "#60a5fa",
    bg: "bg-blue-500/5",
    border: "border-blue-500/30",
    glyph: "G",
  },
  reddit: {
    label: "Reddit",
    color: "text-orange-300",
    hex: "#fb923c",
    bg: "bg-orange-500/5",
    border: "border-orange-500/30",
    glyph: "R",
  },
  twitter: {
    label: "X / Twitter",
    color: "text-sky-300",
    hex: "#38bdf8",
    bg: "bg-sky-500/5",
    border: "border-sky-500/30",
    glyph: "X",
  },
  tiktok: {
    label: "TikTok",
    color: "text-pink-300",
    hex: "#f472b6",
    bg: "bg-pink-500/5",
    border: "border-pink-500/30",
    glyph: "♪",
  },
  instagram: {
    label: "Instagram",
    color: "text-purple-300",
    hex: "#c084fc",
    bg: "bg-purple-500/5",
    border: "border-purple-500/30",
    glyph: "◉",
  },
  threads: {
    label: "Threads",
    color: "text-slate-300",
    hex: "#cbd5e1",
    bg: "bg-slate-500/5",
    border: "border-slate-500/30",
    glyph: "@",
  },
  facebook: {
    label: "Facebook",
    color: "text-indigo-300",
    hex: "#818cf8",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/30",
    glyph: "f",
  },
};

const PLATFORM_ORDER = [
  "google_news",
  "reddit",
  "tiktok",
  "instagram",
  "facebook",
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  } catch {
    return iso;
  }
}

function metaFor(platform: string): PlatformMeta {
  return (
    PLATFORM_META[platform] || {
      label: platform,
      color: "text-slate-300",
      hex: "#94a3b8",
      bg: "bg-slate-500/5",
      border: "border-slate-700/40",
      glyph: "?",
    }
  );
}

// ---------- Mini sparkline ----------
function Sparkline({
  values,
  color,
  width = 120,
  height = 28,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => `${i * step},${height - (v / max) * (height - 2) - 1}`)
    .join(" ");
  const last = values[values.length - 1] || 0;
  const lastY = height - (last / max) * (height - 2) - 1;
  const lastX = (values.length - 1) * step;
  return (
    <svg width={width} height={height} className="block">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  );
}

// ---------- Stacked bar timeline ----------
function StackedTimeline({ stats }: { stats: Stats }) {
  const { labels, series, total_per_hour } = stats.timeline;
  const maxTotal = Math.max(1, ...total_per_hour);
  const W = 720;
  const H = 180;
  const padX = 28;
  const padTop = 12;
  const padBottom = 22;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const barW = innerW / labels.length;
  const gap = 2;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" preserveAspectRatio="xMidYMid meet">
        {/* y-axis grid */}
        {[0.25, 0.5, 0.75, 1].map((p) => {
          const y = padTop + innerH * (1 - p);
          return (
            <g key={p}>
              <line
                x1={padX}
                x2={W - padX}
                y1={y}
                y2={y}
                stroke="#334155"
                strokeWidth={0.5}
                strokeDasharray="2 4"
              />
              <text
                x={padX - 4}
                y={y + 3}
                fontSize={9}
                fill="#64748b"
                textAnchor="end"
              >
                {Math.round(maxTotal * p)}
              </text>
            </g>
          );
        })}
        {/* stacked bars */}
        {labels.map((lab, i) => {
          let yCursor = padTop + innerH;
          const x = padX + i * barW + gap / 2;
          const w = barW - gap;
          return (
            <g key={i}>
              {PLATFORM_ORDER.map((p) => {
                const v = series[p]?.[i] || 0;
                if (v === 0) return null;
                const h = (v / maxTotal) * innerH;
                yCursor -= h;
                const meta = metaFor(p);
                return (
                  <rect
                    key={p}
                    x={x}
                    y={yCursor}
                    width={Math.max(0, w)}
                    height={h}
                    fill={meta.hex}
                    opacity={0.85}
                  >
                    <title>{`${meta.label} • ${lab}: ${v}`}</title>
                  </rect>
                );
              })}
              {(i === 0 || i === labels.length - 1 || i % 4 === 0) && (
                <text
                  x={x + w / 2}
                  y={H - 6}
                  fontSize={9}
                  fill="#64748b"
                  textAnchor="middle"
                >
                  {lab}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------- Page ----------
export default function Amplification() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessages, setScanMessages] = useState<string[]>([]);
  const [openCluster, setOpenCluster] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [platformMentions, setPlatformMentions] = useState<Mention[]>([]);
  const [platformLoading, setPlatformLoading] = useState(false);

  useEffect(() => {
    setMuted(localStorage.getItem("kg_amp_mute_v1") === "1");
  }, []);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("kg_amp_mute_v1", next ? "1" : "0");
      return next;
    });
  };

  const togglePlatform = async (platform: string) => {
    if (selectedPlatform === platform) {
      setSelectedPlatform(null);
      setPlatformMentions([]);
      return;
    }
    setSelectedPlatform(platform);
    setPlatformLoading(true);
    setPlatformMentions([]);
    try {
      const res = await fetch(
        `/api/amplification/mentions?platform=${encodeURIComponent(platform)}&limit=100`
      );
      if (res.ok) {
        const json = await res.json();
        setPlatformMentions(json.mentions || []);
      }
    } finally {
      setPlatformLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/amplification");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerScan = async () => {
    setScanning(true);
    setScanMessages(["Starting amplification scan…"]);
    try {
      const res = await fetch("/api/amplification/scan");
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
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
            const ev = JSON.parse(match[1]);
            if (ev.type === "progress") {
              setScanMessages((prev) => [...prev, ev.message]);
            } else if (ev.type === "complete") {
              setScanMessages((prev) => [
                ...prev,
                `Done. ${ev.summary.inserted} new mentions, ${ev.summary.clustersActive} active clusters.`,
              ]);
            } else if (ev.type === "error") {
              setScanMessages((prev) => [...prev, `ERROR: ${ev.message}`]);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } finally {
      await fetchData();
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const hasAlerts = (data?.alert_count || 0) > 0;
  const pulse = hasAlerts && !muted;
  const stats = data?.stats;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-3">
            <span className="text-blue-400">KG Media</span> Amplification Watch
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Detects when 3+ external sources mention a Kompas controversy within 24h.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasAlerts && (
            <button
              onClick={toggleMute}
              title={muted ? "Alerts are muted — click to enable" : "Mute the pulsing alert"}
              className="px-3 py-2 border border-slate-700 hover:border-slate-500 rounded text-sm text-slate-300 transition-colors cursor-pointer"
            >
              {muted ? "🔕 Muted" : "🔔 Mute alerts"}
            </button>
          )}
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            {scanning ? "Scanning…" : "Scan Now"}
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {hasAlerts && (
        <div
          className={`mb-6 border border-red-500/60 bg-red-500/10 rounded-lg p-4 ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-red-400 text-2xl">🚨</span>
            <div className="flex-1">
              <div className="text-red-400 font-bold uppercase tracking-wider">
                {data!.alert_count} Active Amplification Alert
                {data!.alert_count > 1 ? "s" : ""}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                3+ sources reporting on the same Kompas-related topic. See{" "}
                <Link href="/faq#amplification" className="text-blue-400 hover:text-blue-300 underline">
                  what this means
                </Link>
                .
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scan progress */}
      {scanning && scanMessages.length > 0 && (
        <div className="mb-6 border border-blue-500/30 bg-blue-500/5 rounded-lg p-4">
          <h2 className="text-blue-400 font-bold text-sm uppercase tracking-wider mb-2">
            Scan Progress
          </h2>
          <div className="space-y-1 text-xs font-mono text-slate-300">
            {scanMessages.map((m, i) => (
              <div key={i}>&gt; {m}</div>
            ))}
          </div>
        </div>
      )}

      {loading && !data ? (
        <div className="text-center p-8 text-slate-500">
          Loading amplification data…
        </div>
      ) : (
        <>
          {/* Platform tile grid */}
          {stats && (
            <section className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold">
                  Platforms · last 24h
                </h2>
                <span className="text-xs text-slate-500">
                  {stats.total_mentions} total mentions
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {PLATFORM_ORDER.map((p) => {
                  const meta = metaFor(p);
                  const stat = stats.platforms.find((s) => s.platform === p);
                  const total = stat?.total || 0;
                  const hourly = stat?.hourly || new Array(24).fill(0);
                  const dim = total === 0;
                  const isSelected = selectedPlatform === p;
                  return (
                    <button
                      key={p}
                      onClick={() => total > 0 && togglePlatform(p)}
                      disabled={total === 0}
                      title={total === 0 ? "No mentions to drill into" : `Show ${total} ${meta.label} mentions`}
                      className={`relative text-left rounded-lg p-3 border ${meta.border} ${meta.bg} ${
                        dim ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-opacity-100"
                      } ${
                        isSelected ? "ring-2 ring-offset-2 ring-offset-slate-900" : ""
                      } transition-all`}
                      style={isSelected ? { boxShadow: `0 0 0 2px ${meta.hex}` } : undefined}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded ${meta.color} font-bold text-xs border ${meta.border}`}
                            style={{ backgroundColor: `${meta.hex}20` }}
                          >
                            {meta.glyph}
                          </span>
                          <span className={`text-sm font-semibold ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-bold tabular-nums ${meta.color}`}
                        >
                          {total}
                        </span>
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
                        Top entity
                      </div>
                      <div
                        className="text-xs text-slate-300 truncate mb-2"
                        title={stat?.top_entity || ""}
                      >
                        {stat?.top_entity || (
                          <span className="text-slate-600">—</span>
                        )}
                      </div>
                      <Sparkline values={hourly} color={meta.hex} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Platform drill-down */}
          {selectedPlatform && (
            <section className="mb-8">
              {(() => {
                const meta = metaFor(selectedPlatform);
                return (
                  <div
                    className="rounded-lg border bg-slate-800/20 p-4"
                    style={{ borderColor: `${meta.hex}50` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm uppercase tracking-wider font-bold flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded ${meta.color} font-bold text-[10px] border ${meta.border}`}
                          style={{ backgroundColor: `${meta.hex}20` }}
                        >
                          {meta.glyph}
                        </span>
                        <span className={meta.color}>{meta.label}</span>
                        <span className="text-slate-400">· last 24h</span>
                      </h2>
                      <button
                        onClick={() => togglePlatform(selectedPlatform)}
                        className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors cursor-pointer"
                      >
                        Close ✕
                      </button>
                    </div>
                    {platformLoading ? (
                      <div className="text-sm text-slate-500 p-4 text-center">
                        Loading {meta.label} mentions…
                      </div>
                    ) : platformMentions.length === 0 ? (
                      <div className="text-sm text-slate-500 p-4 text-center">
                        No {meta.label} mentions returned.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                        {platformMentions.map((m) => (
                          <div
                            key={m.id}
                            className="flex flex-col gap-1 text-sm border-b border-slate-700/30 last:border-b-0 pb-3 last:pb-0"
                          >
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline line-clamp-2 font-medium"
                            >
                              {m.title}
                            </a>
                            {m.snippet && m.snippet !== m.title && (
                              <div className="text-xs text-slate-400 line-clamp-2">
                                {m.snippet}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 flex flex-wrap gap-2 items-center">
                              <span className="text-slate-300 font-semibold">
                                {m.source || "(unknown)"}
                              </span>
                              {m.triggered_entity && (
                                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono text-[10px]">
                                  {m.triggered_entity}
                                </span>
                              )}
                              <span>·</span>
                              <span>{formatTime(m.published_at || m.scraped_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </section>
          )}

          {/* 24h stacked timeline */}
          {stats && stats.total_mentions > 0 && (
            <section className="mb-8">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold">
                  Timeline · stacked by platform
                </h2>
                <span className="text-xs text-slate-500">24h, hourly</span>
              </div>
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
                <StackedTimeline stats={stats} />
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                  {PLATFORM_ORDER.map((p) => {
                    const meta = metaFor(p);
                    const total =
                      stats.platforms.find((s) => s.platform === p)?.total || 0;
                    return (
                      <div
                        key={p}
                        className="flex items-center gap-1.5"
                        style={{ opacity: total === 0 ? 0.4 : 1 }}
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: meta.hex }}
                        />
                        <span className="text-slate-400">{meta.label}</span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500 tabular-nums">{total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Cluster cards */}
          {hasAlerts ? (
            <section
              className={`mb-8 rounded-lg p-4 border ${
                pulse
                  ? "border-red-500/60 ring-2 ring-red-500/40"
                  : "border-red-500/30"
              }`}
            >
              <h2 className="text-sm uppercase tracking-wider text-red-400 font-bold mb-3">
                Active Clusters · {data!.alert_count}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data!.clusters.map((c) => {
                  const isOpen = openCluster === c.id;
                  return (
                    <div
                      key={c.id}
                      className="border border-red-500/30 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                    >
                      <button
                        onClick={() =>
                          setOpenCluster((cur) => (cur === c.id ? null : c.id))
                        }
                        className="w-full text-left p-4"
                      >
                        {c.triggered_entity && (
                          <div className="text-[10px] uppercase tracking-wider text-red-400 mb-1">
                            Entity:{" "}
                            <span className="font-bold">{c.triggered_entity}</span>
                          </div>
                        )}
                        {c.source_article && (
                          <div className="text-xs text-slate-300 mb-2 line-clamp-2">
                            About:{" "}
                            <a
                              href={c.source_article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              {c.source_article.title}
                            </a>{" "}
                            <span className="text-slate-500">
                              ({c.source_article.topic})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          {c.keywords.slice(0, 5).map((k) => (
                            <span
                              key={k}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono"
                            >
                              {k}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center justify-between">
                          <span>
                            {c.mention_count} mentions · {c.source_count} sources
                          </span>
                          <span className="text-slate-500">
                            {isOpen ? "− hide" : "+ details"}
                          </span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-slate-700/50 p-4 space-y-4">
                          {c.mentions.slice(0, 8).map((m) => {
                            const meta = metaFor(m.platform);
                            return (
                              <div
                                key={m.id}
                                className="flex flex-col gap-1.5 text-sm"
                              >
                                <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline line-clamp-2 font-medium"
                                >
                                  {m.title}
                                </a>
                                {m.snippet && m.snippet !== m.title && (
                                  <div className="text-xs text-slate-400 line-clamp-3">
                                    {m.snippet}
                                  </div>
                                )}
                                <div className="text-xs flex flex-wrap gap-2 items-center">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-mono ${meta.color}`}
                                    style={{
                                      backgroundColor: `${meta.hex}20`,
                                    }}
                                  >
                                    {meta.label}
                                  </span>
                                  <span className="text-slate-200 font-semibold">
                                    {m.source || "(unknown)"}
                                  </span>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-slate-500">
                                    {formatTime(m.published_at || m.scraped_at)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          {c.mentions.length > 8 && (
                            <div className="text-xs text-slate-500 italic pt-1">
                              + {c.mentions.length - 8} more mentions in this cluster
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="mb-8">
              <div className="text-center p-6 border border-slate-700/50 rounded-lg bg-slate-800/20 text-slate-400">
                <div className="text-3xl mb-2">✓</div>
                <div className="font-semibold text-slate-300">
                  No active amplification alerts
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  No Kompas controversy clusters detected in the last 24 hours.
                </div>
              </div>
            </section>
          )}

          {/* Latest mentions (compact) */}
          {data!.recent && data!.recent.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">
                Latest Mentions
              </h2>
              <div className="border border-slate-700/50 rounded-lg bg-slate-800/20 divide-y divide-slate-700/40">
                {data!.recent.slice(0, 30).map((m) => {
                  const meta = metaFor(m.platform);
                  return (
                    <div key={m.id} className="p-3 flex flex-col gap-1 text-sm">
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline line-clamp-1"
                      >
                        {m.title}
                      </a>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-2 items-center">
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono ${meta.color}`}
                          style={{ backgroundColor: `${meta.hex}20` }}
                        >
                          {meta.label}
                        </span>
                        {m.triggered_entity && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
                            {m.triggered_entity}
                          </span>
                        )}
                        <span>{m.source}</span>
                        <span>·</span>
                        <span>{formatTime(m.published_at || m.scraped_at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      <div className="mt-10 text-center text-xs text-slate-600">
        Free tier: Google News + Reddit RSS. Apify (TikTok / IG / Threads / FB / X)
        and OpenAI (smart entities + semantic clusters) activate automatically when
        their API keys are configured.
      </div>
    </main>
  );
}
