import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id: workflowId, type } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  if (!workflowId) {
    return res.status(400).json({ error: 'Workflow ID is required' })
  }

  // ── Funnel mode: ?type=funnel ────────────────────────────
  if (type === 'funnel') {
    try {
      const { since } = req.query

      const { data: workflow, error: wfError } = await supabase
        .from('workflows')
        .select('components')
        .eq('id', workflowId)
        .single()

      if (wfError) throw wfError
      if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

      const roleOrder = { start: 0, intermediate: 1, end: 2 }
      const orderedComponents = [...(workflow.components || [])].sort(
        (a, b) => (roleOrder[a.role] ?? 1) - (roleOrder[b.role] ?? 1)
      )

      if (orderedComponents.length === 0) {
        return res.status(200).json({ stages: [] })
      }

      let query = supabase
        .from('logs')
        .select('component_id, trace_id')
        .eq('workflow_id', workflowId)
        .not('trace_id', 'is', null)

      if (since) query = query.gte('timestamp', since)

      const { data: logRows, error: logError } = await query
      if (logError) throw logError

      const entityMap = {}
      for (const row of (logRows || [])) {
        if (!row.trace_id) continue
        if (!entityMap[row.component_id]) entityMap[row.component_id] = new Set()
        entityMap[row.component_id].add(row.trace_id)
      }

      const stages = orderedComponents.map((comp, i) => {
        const entitiesHere = entityMap[comp.id] || new Set()
        let dropped_ids = []
        if (i < orderedComponents.length - 1) {
          const entitiesNext = entityMap[orderedComponents[i + 1].id] || new Set()
          dropped_ids = [...entitiesHere]
            .filter(id => !entitiesNext.has(id))
            .map(id => id.slice(0, 16) + '...')
        }
        return {
          component_id: comp.id,
          component_name: comp.name,
          role: comp.role || 'intermediate',
          order_count: entitiesHere.size,
          dropped_ids
        }
      })

      return res.status(200).json({ stages })

    } catch (err) {
      console.error('Error in funnel:', err)
      return res.status(500).json({ error: err.message })
    }
  }

  // ── Default analytics mode ───────────────────────────────
  try {
    const { data, error } = await supabase.rpc('get_workflow_analytics', {
      p_workflow_id: workflowId
    })

    if (error) {
      console.error('Supabase RPC Error:', error)
      throw error
    }

    return res.status(200).json(data)

  } catch (err) {
    console.error('Error in analytics API:', err)
    return res.status(500).json({ error: err.message })
  }
}
