-- Add trace_id to metrics table for Exemplar support
ALTER TABLE metrics ADD COLUMN IF NOT EXISTS trace_id TEXT;
