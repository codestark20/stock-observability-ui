-- Create composite indexes to speed up dashboard queries
-- These indexes match the exact query patterns used by the NodeDetailPanel to ensure lightning-fast data fetching.

-- 1. Metrics table index
-- Speeds up: eq('workflow_id', X) AND eq('component_id', Y) ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_metrics_workflow_component_time 
ON metrics (workflow_id, component_id, created_at DESC);

-- 2. Logs table index
-- Speeds up: eq('workflow_id', X) AND eq('component_id', Y) ORDER BY timestamp
CREATE INDEX IF NOT EXISTS idx_logs_workflow_component_time 
ON logs (workflow_id, component_id, "timestamp" DESC);

-- 3. Profiles table index
-- Speeds up: eq('workflow_id', X) AND eq('component_id', Y) AND eq('trace_id', Z)
CREATE INDEX IF NOT EXISTS idx_profiles_workflow_component_trace 
ON profiles (workflow_id, component_id, trace_id);

-- 4. Events table index (for traces)
-- Speeds up: eq('workflow_id', X) AND eq('component_id', Y) ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_events_workflow_component 
ON events (workflow_id, component_id, created_at ASC);
