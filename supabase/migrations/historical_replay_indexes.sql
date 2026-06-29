-- Metrics: point-in-time snapshot queries
CREATE INDEX IF NOT EXISTS idx_metrics_workflow_component_time
  ON metrics (workflow_id, component_id, created_at DESC);

-- Events: window queries for replay (no 'traces' table — data is in 'events')
CREATE INDEX IF NOT EXISTS idx_events_workflow_time
  ON events (workflow_id, created_at DESC);

-- Logs: correlated log replay
CREATE INDEX IF NOT EXISTS idx_logs_workflow_time
  ON logs (workflow_id, created_at DESC);
