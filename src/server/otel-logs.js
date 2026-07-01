import { createClient } from '@supabase/supabase-js'
import { classifySupabaseError } from '../../api/utils/supabaseErrorHandler.js'
import { writeDeadLetter, hashPayload } from '../../api/utils/deadLetter.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-otel-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
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
    const { resourceLogs } = req.body
    if (!resourceLogs?.length) return res.status(200).json({ ok: true })

    const rows = []

    for (const rl of resourceLogs) {
      const resourceAttrs = rl.resource?.attributes || []
      const serviceName = findAttr(resourceAttrs, 'service.name')

      for (const sl of rl.scopeLogs || []) {
        for (const logRecord of sl.logRecords || []) {
          const attrs = logRecord.attributes || []
          
          const workflowId = authWorkflowId;
          const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id') || serviceName
          
          if (!componentId) continue

          const timestamp = logRecord.timeUnixNano 
            ? new Date(Number(BigInt(logRecord.timeUnixNano) / 1000000n)).toISOString() 
            : new Date().toISOString()

          const body = logRecord.body?.stringValue || JSON.stringify(logRecord.body) || ''
          const severityText = logRecord.severityText || 'INFO'
          
          // Store additional attributes in JSONB
          const attributesMap = {}
          for (const a of attrs) {
            attributesMap[a.key] = a.value.stringValue ?? a.value.intValue ?? a.value.boolValue ?? a.value
          }

          rows.push({
            workflow_id: workflowId,
            component_id: componentId,
            trace_id: logRecord.traceId || null,
            span_id: logRecord.spanId || null,
            severity_text: severityText,
            body: body,
            attributes: attributesMap,
            timestamp: timestamp
          })
        }
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('logs').insert(rows)
      if (error) {
        const classified = classifySupabaseError(error)
        console.error('[otel-logs] Insert failed:', classified.error_class, error.message)

        // Write to dead-letter queue (fire-and-forget)
        const payloadHash = await hashPayload(JSON.stringify(req.body))
        writeDeadLetter({
          route: 'otel-logs',
          error_class: classified.error_class,
          error_message: classified.message,
          span_count: rows.length,
          workflow_id: authWorkflowId,
          payload_hash: payloadHash,
        })

        return res.status(classified.status).json({ error: classified.message })
      }
    }

    return res.status(200).json({ ok: true, inserted: rows.length })
  } catch (err) {
    console.error('Logs ingestion error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
