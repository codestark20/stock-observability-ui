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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-otel-secret')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not configured on server' })
  }

  const apiKey = req.headers['x-api-key'] || req.headers['x-otel-secret'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API Key in headers' });
  }

  // Authenticate API Key
  const { data: workflowAuth, error: authError } = await supabase
    .from('workflows')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (authError || !workflowAuth) {
    return res.status(401).json({ error: 'Invalid API Key' });
  }

  const authWorkflowId = workflowAuth.id;

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
          const workflowId = authWorkflowId;
          const componentId = findAttr(profileAttrs, 'component.id') || findAttr(resourceAttrs, 'component.id')
          const traceId = profile.traceId || findAttr(profileAttrs, 'trace.id') || null

          if (!componentId) continue

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
