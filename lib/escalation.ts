import {
  SLOPE_THRESHOLD_CRITICAL,
  SLOPE_THRESHOLD_ESCALATION,
  SLOPE_THRESHOLD_DEESCALATION,
} from "./config";
import type { Article } from "./types";

export function computeSlope(
  dataPoints: Array<{ hoursAgo: number; score: number }>
): number {
  const n = dataPoints.length;
  if (n < 2) return 0;

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const p of dataPoints) {
    sumX += p.hoursAgo;
    sumY += p.score;
    sumXY += p.hoursAgo * p.score;
    sumXX += p.hoursAgo * p.hoursAgo;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

export function classifyTrend(slope: number): string {
  if (slope <= SLOPE_THRESHOLD_CRITICAL) return "CRITICAL";
  if (slope <= SLOPE_THRESHOLD_ESCALATION) return "ESCALATING";
  if (slope >= SLOPE_THRESHOLD_DEESCALATION) return "DE-ESCALATING";
  return "STABLE";
}

export interface TopicStats {
  avg_compound: number;
  article_count: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  slope: number;
  trend: string;
  sample_headlines: Array<{ title: string; url: string; source: string; score: number }>;
}

export function computeTopicStats(articles: Article[]): TopicStats {
  if (articles.length === 0) {
    return {
      avg_compound: 0,
      article_count: 0,
      positive_pct: 0,
      negative_pct: 0,
      neutral_pct: 0,
      slope: 0,
      trend: "NO DATA",
      sample_headlines: [] as TopicStats["sample_headlines"],
    };
  }

  const now = Date.now();
  const dataPoints = articles.map((a) => ({
    hoursAgo:
      (now - new Date(a.scraped_at || Date.now()).getTime()) / (1000 * 3600),
    score: a.compound_score,
  }));

  const compounds = articles.map((a) => a.compound_score);
  const avg = compounds.reduce((s, c) => s + c, 0) / compounds.length;

  // Only compute slope if articles span at least 3 hours AND we have 5+ data points.
  // Otherwise the regression is statistically meaningless and produces wild values.
  const hoursSpan =
    dataPoints.length > 0
      ? Math.max(...dataPoints.map((p) => p.hoursAgo)) -
        Math.min(...dataPoints.map((p) => p.hoursAgo))
      : 0;

  const hasEnoughData = hoursSpan >= 3 && dataPoints.length >= 5;
  let slope = hasEnoughData ? computeSlope(dataPoints) : 0;

  // Clamp to plausible range: compound scores are [-1, +1], so slopes beyond +/-0.5/hr
  // almost certainly indicate clustered-time noise, not real trend.
  if (slope > 0.5) slope = 0.5;
  if (slope < -0.5) slope = -0.5;

  const trend = hasEnoughData ? classifyTrend(slope) : "STABLE";

  const positive = compounds.filter((c) => c >= 0.05).length;
  const negative = compounds.filter((c) => c <= -0.05).length;
  const neutral = compounds.length - positive - negative;
  const total = compounds.length;

  return {
    avg_compound: Math.round(avg * 1000) / 1000,
    article_count: articles.length,
    positive_pct: Math.round((positive / total) * 1000) / 10,
    negative_pct: Math.round((negative / total) * 1000) / 10,
    neutral_pct: Math.round((neutral / total) * 1000) / 10,
    slope: Math.round(slope * 10000) / 10000,
    trend,
    sample_headlines: articles.slice(0, 5).map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source,
      score: a.compound_score,
    })),
  };
}
