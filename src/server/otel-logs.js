import { createClient } from '@supabase/supabase-js'
import { batchInsert } from './batchInsert.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Logs ingestion handler.
 * Auth is handled upstream by the catch-all gate — req.authWorkflowId is set.
 */
export default async function handler(req, res) {
  try {
    const authWorkflowId = req.authWorkflowId

    const { resourceLogs } = req.body
    if (!resourceLogs?.length) return res.status(200).json({ ok: true })

    const rows = []

    for (const rl of resourceLogs) {
      const resourceAttrs = rl.resource?.attributes || []
      const serviceName = findAttr(resourceAttrs, 'service.name')

      for (const sl of rl.scopeLogs || []) {
        for (const logRecord of sl.logRecords || []) {
          const attrs = logRecord.attributes || []
          
          const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id') || serviceName
          
          if (!componentId) continue

          let timestamp
          try {
            timestamp = logRecord.timeUnixNano
              ? new Date(Number(BigInt(logRecord.timeUnixNano) / 1000000n)).toISOString()
              : new Date().toISOString()
          } catch {
            timestamp = new Date().toISOString()
          }

          const body = logRecord.body?.stringValue || JSON.stringify(logRecord.body) || ''
          const severityText = logRecord.severityText || 'INFO'
          
          // Store additional attributes in JSONB
          const attributesMap = {}
          for (const a of attrs) {
            attributesMap[a.key] = a.value.stringValue ?? a.value.intValue ?? a.value.boolValue ?? a.value
          }

          rows.push({
            workflow_id: authWorkflowId,
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

    const result = await batchInsert(supabase, 'logs', rows, {
      route: 'otel-logs',
      workflow_id: authWorkflowId,
      raw_payload: req.body,
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[otel-logs] Unhandled error:', err)
    return res.status(500).json({ error: 'Internal logs ingestion error' })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
