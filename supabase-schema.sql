-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

CREATE TABLE articles (
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
    analyzer TEXT DEFAULT 'vader'
);

CREATE INDEX idx_articles_topic_scraped ON articles (topic, scraped_at);
CREATE INDEX idx_articles_url ON articles (url);

CREATE TABLE topic_snapshots (
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

CREATE INDEX idx_snapshots_topic_time ON topic_snapshots (topic, snapshot_at);

-- Enable Row Level Security but allow public read for the dashboard
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on articles" ON articles FOR SELECT USING (true);
CREATE POLICY "Allow service role insert on articles" ON articles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on snapshots" ON topic_snapshots FOR SELECT USING (true);
CREATE POLICY "Allow service role insert on snapshots" ON topic_snapshots FOR INSERT WITH CHECK (true);
