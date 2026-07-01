-- Dead-letter table for failed telemetry ingestion
CREATE TABLE IF NOT EXISTS ingest_errors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  route          TEXT NOT NULL,
  error_class    TEXT NOT NULL,
  error_message  TEXT,
  span_count     INTEGER,
  workflow_id    TEXT,
  payload_hash   TEXT
);

CREATE INDEX IF NOT EXISTS ingest_errors_created_at_idx ON ingest_errors (created_at);

-- RLS: allow anon reads (for debugging in Supabase dashboard)
ALTER TABLE ingest_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_ingest_errors" ON ingest_errors
  FOR SELECT TO anon USING (true);

-- Cleanup function: purge entries older than 7 days
CREATE OR REPLACE FUNCTION cleanup_ingest_errors()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM ingest_errors WHERE created_at < now() - INTERVAL '7 days';
END;
$$;

-- Schedule cleanup at 2am daily (requires pg_cron extension)
SELECT cron.schedule('cleanup-ingest-errors', '0 2 * * *', 'SELECT cleanup_ingest_errors()');
