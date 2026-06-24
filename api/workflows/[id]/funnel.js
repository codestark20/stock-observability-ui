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

  const { id: workflowId } = req.query
  const { since } = req.query // optional ISO timestamp for time windowing

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  if (!workflowId) {
    return res.status(400).json({ error: 'Workflow ID is required' })
  }

  try {
    // 1. Fetch the workflow to get the ordered component list
    const { data: workflow, error: wfError } = await supabase
      .from('workflows')
      .select('components')
      .eq('id', workflowId)
      .single()

    if (wfError) throw wfError
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' })

    // Order components: start → intermediate → end
    const roleOrder = { start: 0, intermediate: 1, end: 2 }
    const orderedComponents = [...(workflow.components || [])].sort(
      (a, b) => (roleOrder[a.role] ?? 1) - (roleOrder[b.role] ?? 1)
    )

    if (orderedComponents.length === 0) {
      return res.status(200).json({ stages: [] })
    }

    // 2. Use the 'logs' table which has trace_id + component_id — this is our entity funnel source.
    //    Each unique trace_id per component = one order/entity that passed through that stage.
    let query = supabase
      .from('logs')
      .select('component_id, trace_id')
      .eq('workflow_id', workflowId)
      .not('trace_id', 'is', null)

    if (since) {
      query = query.gte('timestamp', since)
    }

    const { data: logRows, error: logError } = await query

    if (logError) throw logError

    // 3. Group: component_id → Set of trace_ids (each unique trace = one entity passing through)
    const entityMap = {}
    for (const row of (logRows || [])) {
      if (!row.trace_id) continue
      if (!entityMap[row.component_id]) entityMap[row.component_id] = new Set()
      entityMap[row.component_id].add(row.trace_id)
    }

    // 4. Build ordered stages with order_count and dropped_ids between consecutive stages
    const stages = []
    for (let i = 0; i < orderedComponents.length; i++) {
      const comp = orderedComponents[i]
      const entitiesHere = entityMap[comp.id] || new Set()

      let dropped_ids = []

      // Find trace_ids that were seen in this stage but NOT in the next stage
      if (i < orderedComponents.length - 1) {
        const nextComp = orderedComponents[i + 1]
        const entitiesNext = entityMap[nextComp.id] || new Set()
        // Truncate to first 8 chars of trace_id for readability
        dropped_ids = [...entitiesHere]
          .filter(id => !entitiesNext.has(id))
          .map(id => id.slice(0, 16) + '...')
      }

      stages.push({
        component_id: comp.id,
        component_name: comp.name,
        role: comp.role || 'intermediate',
        order_count: entitiesHere.size,
        dropped_ids
      })
    }

    return res.status(200).json({ stages })

  } catch (err) {
    console.error('Error in funnel API:', err)
    return res.status(500).json({ error: err.message })
  }
}
