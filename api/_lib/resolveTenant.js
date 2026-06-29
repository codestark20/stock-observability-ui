import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function resolveTenant(req) {
  const secret = req.headers['x-otel-secret'];
  if (!secret) return null;

  const { data, error } = await supabase
    .from('tenants')
    .select('id, owner_id, plan')
    .eq('ingest_secret', secret)
    .single();

  if (error || !data) return null;
  return { tenantId: data.owner_id, plan: data.plan ?? 'starter' };
}
