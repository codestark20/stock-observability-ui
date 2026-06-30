import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey)
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured on server' })
  }

  try {
    const payload = req.body

    // Basic support for standard OTLP-ish payload or custom format
    const resourceProfiles = payload.resourceProfiles || []
    const rows = []

    for (const rp of resourceProfiles) {
      const resourceAttrs = rp.resource?.attributes || []
      const tenantId = findAttr(resourceAttrs, 'tenant.id') || null

      for (const sp of rp.scopeProfiles || []) {
        for (const profile of sp.profiles || []) {
          const profileAttrs = profile.attributes || []
          const workflowId = findAttr(profileAttrs, 'workflow.id') || findAttr(resourceAttrs, 'workflow.id')
          const componentId = findAttr(profileAttrs, 'component.id') || findAttr(resourceAttrs, 'component.id')
          const traceId = profile.traceId || findAttr(profileAttrs, 'trace.id') || null

          if (!workflowId || !componentId) continue

          rows.push({
            tenant_id: tenantId,
            workflow_id: workflowId,
            component_id: componentId,
            trace_id: traceId,
            profile_data: profile.profile_data || profile // store the raw profile tree
          })
        }
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('profiles').insert(rows)
      if (error) {
        console.error('Supabase insert error:', error)
        return res.status(500).json({ error: error.message })
      }
    }

    return res.status(200).json({ ok: true, inserted: rows.length })
  } catch (err) {
    console.error('Profiles ingestion error:', err)
    return res.status(500).json({ error: err.message })
  }
}
