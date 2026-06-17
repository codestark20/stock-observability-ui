CREATE TABLE IF NOT EXISTS public.events_archive (
  id UUID PRIMARY KEY,
  workflow_id TEXT,
  component_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT DEFAULT 'healthy',
  duration_ms INTEGER DEFAULT 0,
  message TEXT DEFAULT '',
  method TEXT DEFAULT 'POST',
  action TEXT DEFAULT '',
  status_code INTEGER DEFAULT 200,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION public.archive_old_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert events older than 7 days into archive table
  INSERT INTO public.events_archive
  SELECT *
  FROM public.events
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete them from the active events table
  DELETE FROM public.events
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;
