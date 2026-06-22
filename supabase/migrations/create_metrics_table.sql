-- ============================================
-- Metrics Table for Real-Time OTel Metrics
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast time-range queries per component
CREATE INDEX IF NOT EXISTS idx_metrics_lookup
  ON metrics (workflow_id, component_id, metric_name, created_at DESC);

-- Enable Realtime on the metrics table
ALTER PUBLICATION supabase_realtime ADD TABLE metrics;

-- Auto-cleanup: delete metrics older than 7 days (optional, run via cron)
-- DELETE FROM metrics WHERE created_at < NOW() - INTERVAL '7 days';
