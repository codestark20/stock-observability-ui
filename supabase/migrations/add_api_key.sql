-- Add api_key to workflows table
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS api_key UUID DEFAULT gen_random_uuid();
ALTER TABLE workflows ADD CONSTRAINT workflows_api_key_key UNIQUE (api_key);

-- Allow public reads of api_key so the frontend can display it
-- (Assuming workflows table already has RLS enabled, we just ensure it's selectable)
-- Note: If we had user auth, we would restrict this to only the workflow owner.
-- For now, allow public read of the workflows table as it currently is.
