import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id: workflow_id } = req.query;
  const { timestamp, windowMs = 300000 } = req.query; // windowMs default: 5 minutes either side of the timestamp

  if (!timestamp) {
    return res.status(400).json({ error: 'timestamp is required' });
  }

  const center = new Date(timestamp);
  const startAt = new Date(center.getTime() - Number(windowMs)).toISOString();
  const endAt = new Date(center.getTime() + Number(windowMs)).toISOString();

  const { data, error } = await supabase
    .from('traces')
    .select('*')
    .eq('workflow_id', workflow_id)
    .gte('created_at', startAt)
    .lte('created_at', endAt)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ traces: data, startAt, endAt });
}
