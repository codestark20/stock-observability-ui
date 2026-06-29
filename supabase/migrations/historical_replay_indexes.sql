-- Metrics: point-in-time snapshot queries
CREATE INDEX IF NOT EXISTS idx_metrics_workflow_component_time
  ON metrics (workflow_id, component_id, created_at DESC);

-- Traces: window queries for replay
CREATE INDEX IF NOT EXISTS idx_traces_workflow_time
  ON traces (workflow_id, created_at DESC);

-- Logs: correlated log replay
CREATE INDEX IF NOT EXISTS idx_logs_workflow_time
  ON logs (workflow_id, timestamp DESC);
