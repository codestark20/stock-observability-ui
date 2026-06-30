-- Allow anonymous reads on metrics, logs, and profiles
-- (The dashboard uses the anon key in the browser, which is blocked by default RLS)

-- Metrics table
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_anon_read_metrics" ON metrics
  FOR SELECT USING (true);

-- Logs table
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_anon_read_logs" ON logs
  FOR SELECT USING (true);

-- Profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_anon_read_profiles" ON profiles
  FOR SELECT USING (true);

-- Events table (for traces)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "allow_anon_read_events" ON events
  FOR SELECT USING (true);
