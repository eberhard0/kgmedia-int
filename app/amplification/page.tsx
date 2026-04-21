"use client";

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
}

interface ApiResponse {
  updated_at: string;
  alert_count: number;
  clusters: Cluster[];
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return iso;
  }
}

export default function Amplification() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessages, setScanMessages] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasAlerts = (data?.alert_count || 0) > 0;

  return (
    <main
      className={`min-h-screen p-4 md:p-8 max-w-6xl mx-auto ${
        hasAlerts ? "ring-4 ring-red-500/60 animate-pulse" : ""
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            &larr; Back to Dashboard
          </a>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-3">
            <span className="text-blue-400">KG Media</span> Amplification Watch
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Detects when 3+ external sources mention a Kompas controversy
            within 24h.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors cursor-pointer"
          >
            {scanning ? "Scanning…" : "Scan Now"}
          </button>
        </div>
      </div>

      {hasAlerts && (
        <div className="mb-6 border border-red-500/60 bg-red-500/10 rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-red-400 text-2xl">🚨</span>
            <div>
              <div className="text-red-400 font-bold uppercase tracking-wider">
                {data!.alert_count} Active Amplification Alert
                {data!.alert_count > 1 ? "s" : ""}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                3+ sources reporting on the same Kompas-related topic. Expand
                each cluster to review.
              </div>
            </div>
          </div>
        </div>
      )}

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
      ) : !hasAlerts ? (
        <div className="text-center p-8 border border-slate-700/50 rounded-lg bg-slate-800/20 text-slate-400">
          <div className="text-4xl mb-2">✓</div>
          <div className="font-semibold text-slate-300">
            No active amplification alerts
          </div>
          <div className="text-xs text-slate-500 mt-1">
            No Kompas controversy clusters detected in the last 24 hours.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {data!.clusters.map((c) => {
            const isOpen = expanded.has(c.id);
            return (
              <div
                key={c.id}
                className="border border-red-500/30 rounded-lg bg-slate-800/30"
              >
                <button
                  onClick={() => toggle(c.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {c.keywords.slice(0, 6).map((k) => (
                        <span
                          key={k}
                          className="text-[11px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.mention_count} mentions · {c.source_count} distinct
                      sources · first seen {formatTime(c.first_seen)}
                    </div>
                  </div>
                  <span className="text-slate-400 text-lg">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700/50 p-4 space-y-3">
                    {c.mentions.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-col gap-1 text-sm"
                      >
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {m.title}
                        </a>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 font-mono">
                            {m.platform}
                          </span>
                          <span>{m.source}</span>
                          <span>·</span>
                          <span>
                            {formatTime(m.published_at || m.scraped_at)}
                          </span>
                        </div>
                        {m.snippet && (
                          <div className="text-xs text-slate-400 line-clamp-2">
                            {m.snippet}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-center text-xs text-slate-600">
        Free-tier sources: Google News RSS + Reddit RSS. TikTok, Instagram,
        Threads, Facebook posts are not directly accessible without paid
        scrapers.
      </div>
    </main>
  );
}
