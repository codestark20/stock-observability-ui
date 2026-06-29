CREATE TABLE IF NOT EXISTS rate_limit_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES auth.users(id),
  endpoint TEXT NOT NULL,
  breached_at TIMESTAMPTZ DEFAULT NOW(),
  retry_after INT
);

CREATE INDEX IF NOT EXISTS idx_rl_breaches_tenant
  ON rate_limit_breaches (tenant_id, breached_at DESC);
