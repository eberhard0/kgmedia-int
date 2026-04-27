-- KG Media Internal Prediction Algo — vanilla Postgres schema
-- Apply with:  psql -d kgmedia_int -f db/schema.sql
--
-- Differs from supabase-schema.sql:
--   * No RLS policies — only the kgmedia_app DB user connects to this DB,
--     access is controlled at the connection level
--   * Adds kompas_article_id + triggered_entity columns that grew on
--     amplification tables in v1.0+
--   * Adds push_devices table (was server-patches/push-devices.sql)
--   * Plain PostgreSQL: no Supabase auth schemas, no JWT helpers

CREATE TABLE IF NOT EXISTS articles (
    id BIGSERIAL PRIMARY KEY,
    topic TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT '',
    published_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    compound_score DOUBLE PRECISION DEFAULT 0,
    pos_score DOUBLE PRECISION DEFAULT 0,
    neg_score DOUBLE PRECISION DEFAULT 0,
    neu_score DOUBLE PRECISION DEFAULT 0,
    sentiment_label TEXT DEFAULT 'neutral',
    analyzer TEXT DEFAULT 'finbert'
);

CREATE INDEX IF NOT EXISTS idx_articles_topic_scraped ON articles (topic, scraped_at);
CREATE INDEX IF NOT EXISTS idx_articles_url ON articles (url);

CREATE TABLE IF NOT EXISTS topic_snapshots (
    id BIGSERIAL PRIMARY KEY,
    topic TEXT NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT NOW(),
    avg_compound DOUBLE PRECISION DEFAULT 0,
    article_count INTEGER DEFAULT 0,
    positive_pct DOUBLE PRECISION DEFAULT 0,
    negative_pct DOUBLE PRECISION DEFAULT 0,
    neutral_pct DOUBLE PRECISION DEFAULT 0,
    slope DOUBLE PRECISION DEFAULT 0,
    trend TEXT DEFAULT 'STABLE'
);

CREATE INDEX IF NOT EXISTS idx_snapshots_topic_time ON topic_snapshots (topic, snapshot_at);

-- Amplification: posts on external platforms that name a KG Media brand.
-- See lib/amplification.ts → KG_BRAND_TERMS for the brand filter.
CREATE TABLE IF NOT EXISTS amplification_mentions (
    id BIGSERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,            -- google_news | reddit | tiktok | instagram | facebook | twitter
    source TEXT DEFAULT '',            -- outlet domain / subreddit / author handle
    title TEXT NOT NULL,
    snippet TEXT DEFAULT '',
    published_at TIMESTAMPTZ,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    tokens TEXT[] DEFAULT '{}',        -- cached tokenized title+snippet for Jaccard fallback
    trigger_query TEXT DEFAULT '',
    cluster_id BIGINT,
    kompas_article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    triggered_entity TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_amp_mentions_scraped ON amplification_mentions (scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_amp_mentions_cluster ON amplification_mentions (cluster_id);
CREATE INDEX IF NOT EXISTS idx_amp_mentions_platform_scraped ON amplification_mentions (platform, scraped_at DESC);

CREATE TABLE IF NOT EXISTS amplification_clusters (
    id BIGSERIAL PRIMARY KEY,
    keywords TEXT[] DEFAULT '{}',
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    mention_count INTEGER DEFAULT 0,
    source_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',      -- active | resolved
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    kompas_article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    triggered_entity TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_amp_clusters_status ON amplification_clusters (status, last_seen DESC);

-- Mobile push device registry (was server-patches/push-devices.sql).
-- Receives Expo push tokens registered by the mobile app on first launch.
CREATE TABLE IF NOT EXISTS push_devices (
    id BIGSERIAL PRIMARY KEY,
    expo_token TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL,            -- ios | android
    device_id TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_devices_last_seen ON push_devices (last_seen_at DESC);
