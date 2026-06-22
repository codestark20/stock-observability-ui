-- ============================================
-- Logs Table for Real-Time OTel Logs
-- ============================================
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  trace_id TEXT,
  severity_text TEXT,
  body TEXT,
  attributes JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Index for fast time-range queries per component
CREATE INDEX IF NOT EXISTS idx_logs_lookup
  ON logs (workflow_id, component_id, timestamp DESC);

-- Enable Realtime on the logs table
ALTER PUBLICATION supabase_realtime ADD TABLE logs;

-- Auto-cleanup: delete logs older than 7 days (optional, run via cron)
-- DELETE FROM logs WHERE timestamp < NOW() - INTERVAL '7 days';
