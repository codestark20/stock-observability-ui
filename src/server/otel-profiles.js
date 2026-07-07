import { createClient } from '@supabase/supabase-js'
import { batchInsert } from './batchInsert.js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

/**
 * Profiles ingestion handler.
 * Auth is handled upstream by the catch-all gate — req.authWorkflowId is set.
 */
export default async function handler(req, res) {
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured on server' })
  }

  try {
    const authWorkflowId = req.authWorkflowId
    const payload = req.body

    const resourceProfiles = payload.resourceProfiles || []
    const rows = []

    for (const rp of resourceProfiles) {
      const resourceAttrs = rp.resource?.attributes || []

      for (const sp of rp.scopeProfiles || []) {
        for (const profile of sp.profiles || []) {
          const profileAttrs = profile.attributes || []
          const componentId = findAttr(profileAttrs, 'component.id') || findAttr(resourceAttrs, 'component.id')
          const traceId = profile.traceId || findAttr(profileAttrs, 'trace.id') || null

          if (!componentId) continue

          rows.push({
            workflow_id: authWorkflowId,
            component_id: componentId,
            trace_id: traceId,
            profile_data: profile.profile_data || profile // store the raw profile tree
          })
        }
      }
    }

    const result = await batchInsert(supabase, 'profiles', rows, {
      route: 'otel-profiles',
      workflow_id: authWorkflowId,
      raw_payload: req.body,
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[otel-profiles] Unhandled error:', err)
    return res.status(500).json({ error: 'Internal profiles ingestion error' })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
