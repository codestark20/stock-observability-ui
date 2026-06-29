import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id } = req.query

  try {
    if (req.method === 'GET') {
      if (req.query.action === 'snapshot') {
        const { timestamp } = req.query;
        if (!timestamp) return res.status(400).json({ error: 'timestamp is required' });

        const { data: components } = await supabase
          .from('metrics')
          .select('component_id')
          .eq('workflow_id', id)
          .lte('created_at', timestamp)
          .order('created_at', { ascending: false });

        if (!components) return res.status(200).json({ snapshot: [] });

        const componentIds = [...new Set(components.map(r => r.component_id))];

        const snapshots = await Promise.all(
          componentIds.map(async (component_id) => {
            const { data } = await supabase
              .from('metrics')
              .select('component_id, metric_name, value, created_at')
              .eq('workflow_id', id)
              .eq('component_id', component_id)
              .lte('created_at', timestamp)
              .order('created_at', { ascending: false })
              .limit(20);
            // map created_at back to timestamp so the frontend doesn't break
            return (data ?? []).map(r => ({ ...r, timestamp: r.created_at }));
          })
        );
        return res.status(200).json({ snapshot: snapshots.flat() });
      }

      if (req.query.action === 'replay-traces') {
        const { timestamp, windowMs = 300000 } = req.query;
        if (!timestamp) return res.status(400).json({ error: 'timestamp is required' });

        const center = new Date(timestamp);
        const startAt = new Date(center.getTime() - Number(windowMs)).toISOString();
        const endAt = new Date(center.getTime() + Number(windowMs)).toISOString();

        const { data, error } = await supabase
          .from('traces')
          .select('*')
          .eq('workflow_id', id)
          .gte('created_at', startAt)
          .lte('created_at', endAt)
          .order('created_at', { ascending: true })
          .limit(500);

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ traces: data, startAt, endAt });
      }

      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Workflow not found' })

      const { common_link, ...rest } = data
      return res.status(200).json({ ...rest, commonLink: common_link })
    }

    if (req.method === 'PUT') {
      const { name, commonLink, components, nodes, edges } = req.body

      const updates = { updated_at: new Date().toISOString() }
      if (name !== undefined) updates.name = name
      if (commonLink !== undefined) updates.common_link = commonLink
      if (components !== undefined) updates.components = components
      if (nodes !== undefined) updates.nodes = nodes
      if (edges !== undefined) updates.edges = edges

      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      if (!data) return res.status(404).json({ error: 'Workflow not found' })

      const { common_link, ...rest } = data
      return res.status(200).json({ ...rest, commonLink: common_link })
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id)

      if (error) throw error
      return res.status(200).json({ success: true, id })
    }

    if (req.method === 'POST') {
      const { data: original, error: fetchError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError
      if (!original) return res.status(404).json({ error: 'Workflow not found' })

      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const newId = `wf_${Date.now()}_${randomSuffix}`
      const now = new Date().toISOString()

      const { data: duplicate, error: insertError } = await supabase
        .from('workflows')
        .insert({
          id: newId,
          name: `${original.name} (Copy)`,
          common_link: original.common_link,
          components: original.components,
          nodes: original.nodes,
          edges: original.edges,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (insertError) throw insertError
      const { common_link, ...rest } = duplicate
      return res.status(201).json({ ...rest, commonLink: common_link })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err) {
    console.error(`Error in /api/workflows/${id}:`, err)
    return res.status(500).json({ error: err.message })
  }
}
