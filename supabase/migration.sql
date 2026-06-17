-- ══════════════════════════════════════════════════════════
-- STOCK OBSERVABILITY — DATABASE SCHEMA
-- Run this SQL in the Supabase SQL Editor (one-time setup)
-- ══════════════════════════════════════════════════════════

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  common_link TEXT DEFAULT '',
  components JSONB DEFAULT '[]'::jsonb,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (ingestion store)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT REFERENCES workflows(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  duration_ms INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  method TEXT DEFAULT 'POST',
  action TEXT DEFAULT '',
  status_code INTEGER DEFAULT 200,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_entity_id ON events(entity_id);
CREATE INDEX IF NOT EXISTS idx_events_workflow_id ON events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_events_component_id ON events(component_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Enable Realtime on events table
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Row Level Security (open access, no auth)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on workflows" ON workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
