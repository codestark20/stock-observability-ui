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

  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        status: 'ok',
        endpoint: '/api/v1/events',
        method: 'POST',
      })
    }

    if (req.method === 'POST') {
      const {
        component_id,
        entity_id,
        status,
        duration_ms,
        message,
        method,
        action,
        status_code,
        metadata,
        workflow_id: bodyWorkflowId,
      } = req.body

      if (!component_id) {
        return res.status(400).json({ error: 'component_id is required' })
      }

      // Derive workflow_id by finding which workflow contains this component_id
      let workflowId = null

      const { data: workflows, error: wfError } = await supabase
        .from('workflows')
        .select('id, components')

      if (wfError) throw wfError

      if (workflows) {
        for (const wf of workflows) {
          const components = wf.components || []
          const match = components.some((comp) => {
            // Support components as objects with an id field, or as plain strings
            if (typeof comp === 'object' && comp !== null) {
              return comp.id === component_id || comp.component_id === component_id
            }
            return comp === component_id
          })
          if (match) {
            workflowId = wf.id
            break
          }
        }
      }

      // Fall back to the optional workflow_id from the request body
      if (!workflowId) {
        workflowId = bodyWorkflowId || null
      }

      if (!workflowId) {
        return res.status(400).json({
          error: 'Could not determine workflow_id. No workflow contains the given component_id, and no workflow_id was provided in the request body.',
        })
      }

      const { data: event, error: insertError } = await supabase
        .from('events')
        .insert({
          workflow_id: workflowId,
          component_id,
          entity_id: entity_id || null,
          status: status || null,
          duration_ms: duration_ms || null,
          message: message || null,
          method: method || null,
          action: action || null,
          status_code: status_code || null,
          metadata: metadata || null,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      return res.status(201).json({ success: true, event_id: event.id })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  } catch (err) {
    console.error('Error in /api/v1/events:', err)
    return res.status(500).json({ error: err.message })
  }
}
