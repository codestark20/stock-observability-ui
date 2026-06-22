-- ============================================
-- Analytics RPC for Supabase
-- ============================================
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_workflow_analytics(p_workflow_id TEXT)
RETURNS JSON AS $$
DECLARE
  v_total_events INT;
  v_healthy_count INT;
  v_warning_count INT;
  v_critical_count INT;
  v_total_duration BIGINT;
  v_success_rate NUMERIC;
  v_avg_duration NUMERIC;
  v_component_breakdown JSON;
  v_avg_duration_per_component JSON;
BEGIN
  -- Basic metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'healthy'),
    COUNT(*) FILTER (WHERE status = 'warning'),
    COUNT(*) FILTER (WHERE status IN ('critical', 'failed')),
    SUM(duration_ms)
  INTO 
    v_total_events,
    v_healthy_count,
    v_warning_count,
    v_critical_count,
    v_total_duration
  FROM events
  WHERE workflow_id = p_workflow_id;

  -- Calculate derivatives
  IF v_total_events > 0 THEN
    v_success_rate := (v_healthy_count::NUMERIC / v_total_events::NUMERIC) * 100.0;
    v_avg_duration := v_total_duration::NUMERIC / v_total_events::NUMERIC;
  ELSE
    v_success_rate := 0;
    v_avg_duration := 0;
  END IF;

  -- Component breakdowns
  SELECT 
    json_object_agg(component_id, event_count),
    json_object_agg(component_id, avg_duration)
  INTO
    v_component_breakdown,
    v_avg_duration_per_component
  FROM (
    SELECT 
      component_id, 
      COUNT(*) as event_count, 
      AVG(duration_ms) as avg_duration
    FROM events
    WHERE workflow_id = p_workflow_id
      AND component_id IS NOT NULL
    GROUP BY component_id
  ) subquery;

  -- Return final JSON payload matching existing API signature
  RETURN json_build_object(
    'workflowId', p_workflow_id,
    'totalEvents', COALESCE(v_total_events, 0),
    'successRate', COALESCE(v_success_rate, 0),
    'averageDuration', COALESCE(v_avg_duration, 0),
    'statusBreakdown', json_build_object(
      'healthy', COALESCE(v_healthy_count, 0),
      'warning', COALESCE(v_warning_count, 0),
      'critical', COALESCE(v_critical_count, 0)
    ),
    'componentBreakdown', COALESCE(v_component_breakdown, '{}'::JSON),
    'avgDurationPerComponent', COALESCE(v_avg_duration_per_component, '{}'::JSON)
  );
END;
$$ LANGUAGE plpgsql;
