import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const workflowId = req.query.id
  if (!workflowId) return res.status(400).json({ error: 'Missing workflow ID' })

  try {
    // 1. Fetch recent events with span info
    const { data: events, error } = await supabase
      .from('events')
      .select('component_id, span_id, parent_span_id')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(2000)

    if (error) throw error
    if (!events || events.length === 0) {
      return res.status(200).json({ edges: [], missingNodes: [] })
    }

    // 2. Build span map
    const spanMap = new Map() // span_id -> component_id
    const componentsSeen = new Set()

    for (const evt of events) {
      if (evt.span_id) {
        spanMap.set(evt.span_id, evt.component_id)
      }
      if (evt.component_id) {
        componentsSeen.add(evt.component_id)
      }
    }

    // 3. Discover edges
    const discoveredEdges = new Set() // Store as "source|target" to deduplicate
    const edgesArray = []

    for (const evt of events) {
      if (evt.parent_span_id && evt.span_id && evt.component_id) {
        const parentComponent = spanMap.get(evt.parent_span_id)
        
        // Only create an edge if parent exists and is different from child
        if (parentComponent && parentComponent !== evt.component_id) {
          const edgeKey = `${parentComponent}|${evt.component_id}`
          if (!discoveredEdges.has(edgeKey)) {
            discoveredEdges.add(edgeKey)
            edgesArray.push({
              source: parentComponent,
              target: evt.component_id
            })
          }
        }
      }
    }

    // 4. Find components in traces that are not in the current workflow (to auto-create them)
    // We need to fetch the current workflow definition to check
    const { data: workflowData } = await supabase
      .from('workflows')
      .select('components')
      .eq('id', workflowId)
      .single()

    const existingComponentIds = new Set((workflowData?.components || []).map(c => c.id))
    const missingNodes = []

    for (const compId of componentsSeen) {
      if (!existingComponentIds.has(compId)) {
        missingNodes.push({
          id: compId,
          name: formatComponentName(compId),
          status: 'healthy'
        })
      }
    }

    return res.status(200).json({ 
      edges: edgesArray,
      missingNodes
    })
  } catch (err) {
    console.error('Discovery error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function formatComponentName(id) {
  // e.g. "checkout-service" -> "Checkout Service"
  return id
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
