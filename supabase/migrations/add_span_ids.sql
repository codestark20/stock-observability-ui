-- ============================================
-- Update Events Table for Auto-Discovery
-- ============================================

-- Add span ID columns if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='span_id') THEN
    ALTER TABLE events ADD COLUMN span_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='parent_span_id') THEN
    ALTER TABLE events ADD COLUMN parent_span_id TEXT;
  END IF;
END $$;

-- Create an index to quickly resolve parent-child relationships
CREATE INDEX IF NOT EXISTS idx_events_span_ids ON events(span_id, parent_span_id);
