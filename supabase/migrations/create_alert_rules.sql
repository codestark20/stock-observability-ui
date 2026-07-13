-- Run this SQL in Supabase SQL Editor (https://app.supabase.com)
-- Project: kxregqcehbbhjgroonnw

CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id text NOT NULL,
  component_id text NOT NULL,
  metric_name text NOT NULL,
  threshold float8 NOT NULL,
  condition text NOT NULL DEFAULT 'gt',
  severity text NOT NULL DEFAULT 'warning',
  slack_webhook_url text,
  cooldown_minutes int NOT NULL DEFAULT 15,
  last_fired_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_workflow ON alert_rules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_component ON alert_rules(component_id);

-- Allow the anon role to read rules (for the frontend)
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON alert_rules
  USING (true)
  WITH CHECK (true);
