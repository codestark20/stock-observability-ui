import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { owner_id, name, slug } = req.body;

  const { data, error } = await supabase
    .from('tenants')
    .insert({ owner_id, name, slug })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({
    tenant: data,
    ingest_secret: data.ingest_secret, // return once, store safely
  });
}
