// Shared row-type definitions. Plain interfaces — no client coupling
// so this file works with either the legacy Supabase client or the new
// pg-based lib/db.ts.

export interface Article {
  id?: number;
  topic: string;
  title: string;
  url: string;
  source: string;
  published_at: string | null;
  scraped_at?: string;
  compound_score: number;
  pos_score: number;
  neg_score: number;
  neu_score: number;
  sentiment_label: string;
  analyzer: string;
}

export interface TopicSnapshot {
  id?: number;
  topic: string;
  snapshot_at?: string;
  avg_compound: number;
  article_count: number;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  slope: number;
  trend: string;
}

export interface AmplificationMention {
  id?: number;
  url: string;
  platform: string;
  source: string;
  title: string;
  snippet: string;
  published_at: string | null;
  scraped_at?: string;
  tokens: string[];
  trigger_query: string;
  cluster_id: number | null;
  kompas_article_id?: number | null;
  triggered_entity?: string;
}

export interface AmplificationCluster {
  id?: number;
  keywords: string[];
  first_seen: string;
  last_seen: string;
  mention_count: number;
  source_count: number;
  status: string;
  updated_at?: string;
  kompas_article_id?: number | null;
  triggered_entity?: string;
}
