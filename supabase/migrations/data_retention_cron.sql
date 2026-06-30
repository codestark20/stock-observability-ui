-- 1. Enable the pg_cron extension (required for scheduling jobs)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create a function that deletes data older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_telemetry()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete old logs (we use 'timestamp' column for logs)
  DELETE FROM logs WHERE "timestamp" < NOW() - INTERVAL '7 days';
  
  -- Delete old metrics
  DELETE FROM metrics WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete old profiles
  DELETE FROM profiles WHERE created_at < NOW() - INTERVAL '7 days';
  
  -- Delete old events (traces)
  DELETE FROM events WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 3. Schedule the cron job to run every night at midnight (UTC)
-- The first argument is the job name, the second is the cron schedule, the third is the command
SELECT cron.schedule(
  'cleanup-telemetry-job',
  '0 0 * * *',
  'SELECT cleanup_old_telemetry();'
);
