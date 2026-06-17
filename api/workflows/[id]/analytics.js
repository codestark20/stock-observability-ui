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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  if (!workflowId) {
    return res.status(400).json({ error: 'Workflow ID is required' })
  }

  try {
    const { data: events, error } = await supabase
      .from('events')
      .select('component_id, status, duration_ms')
      .eq('workflow_id', workflowId)

    if (error) throw error

    let totalEvents = events.length
    let healthyCount = 0
    let warningCount = 0
    let criticalCount = 0
    let componentDurationSum = {}
    let componentDurationCount = {}

    for (const event of events) {
      if (event.status === 'healthy') healthyCount++
      else if (event.status === 'warning') warningCount++
      else if (event.status === 'critical' || event.status === 'failed') criticalCount++

      if (event.component_id && event.duration_ms !== null) {
        if (!componentDurationSum[event.component_id]) {
          componentDurationSum[event.component_id] = 0
          componentDurationCount[event.component_id] = 0
        }
        componentDurationSum[event.component_id] += event.duration_ms
        componentDurationCount[event.component_id] += 1
      }
    }

    const avgDurationPerComponent = {}
    for (const compId in componentDurationSum) {
      avgDurationPerComponent[compId] = componentDurationSum[compId] / componentDurationCount[compId]
    }

    return res.status(200).json({
      workflow_id: workflowId,
      total_events: totalEvents,
      status_counts: {
        healthy: healthyCount,
        warning: warningCount,
        critical: criticalCount
      },
      avg_duration_per_component: avgDurationPerComponent
    })

  } catch (err) {
    console.error('Error in analytics API:', err)
    return res.status(500).json({ error: err.message })
  }
}
