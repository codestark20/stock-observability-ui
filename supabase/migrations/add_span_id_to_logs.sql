-- Add span_id column to the logs table if it doesn't already exist.
-- The trace_id column already exists from the initial create_logs_table.sql migration.

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='logs' AND column_name='span_id') THEN
    ALTER TABLE logs ADD COLUMN span_id TEXT;
  END IF;
END $$;
