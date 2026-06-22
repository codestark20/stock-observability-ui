-- Fix 1: Disable RLS on all observability tables so the frontend can read them.
-- By default, Supabase enables RLS which blocks the frontend from fetching or receiving Realtime events.
ALTER TABLE metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE traces DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

-- Fix 2: Alter logs table span_id to be TEXT instead of UUID
-- The OTel SDK sends spanIds as 16-character hex strings, not UUIDs.
ALTER TABLE logs ALTER COLUMN span_id TYPE TEXT USING span_id::text;
