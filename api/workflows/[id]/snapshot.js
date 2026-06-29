import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id: workflow_id } = req.query;
  const { timestamp } = req.query;

  if (!timestamp) {
    return res.status(400).json({ error: 'timestamp is required' });
  }

  // For each component, get the last metric row at or before the timestamp
  const { data: components } = await supabase
    .from('metrics')
    .select('component_id')
    .eq('workflow_id', workflow_id)
    .lte('timestamp', timestamp)
    .order('timestamp', { ascending: false });

  if (!components) return res.status(200).json({ snapshot: [] });

  // Unique component IDs
  const componentIds = [...new Set(components.map(r => r.component_id))];

  // Fetch last metric per component at or before timestamp
  const snapshots = await Promise.all(
    componentIds.map(async (component_id) => {
      const { data } = await supabase
        .from('metrics')
        .select('component_id, metric_name, value, timestamp')
        .eq('workflow_id', workflow_id)
        .eq('component_id', component_id)
        .lte('timestamp', timestamp)
        .order('timestamp', { ascending: false })
        .limit(20); // last 20 metric types per component

      return data ?? [];
    })
  );

  return res.status(200).json({ snapshot: snapshots.flat() });
}
