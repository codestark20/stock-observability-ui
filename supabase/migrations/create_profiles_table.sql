-- Create profiles table for Continuous Profiling feature
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  workflow_id TEXT NOT NULL,
  component_id TEXT NOT NULL,
  trace_id TEXT, -- Optional, to correlate with a specific trace
  profile_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for fast querying by component and trace
CREATE INDEX IF NOT EXISTS profiles_workflow_component_idx ON profiles(workflow_id, component_id);
CREATE INDEX IF NOT EXISTS profiles_trace_idx ON profiles(trace_id);
