import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const key = supabaseServiceKey || supabaseAnonKey;
    if (!supabaseUrl || !key) {
      throw new Error("Missing Supabase credentials");
    }
    _supabaseAdmin = createClient(supabaseUrl, key);
  }
  return _supabaseAdmin;
}

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
