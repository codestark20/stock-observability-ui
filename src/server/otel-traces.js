import { createClient } from '@supabase/supabase-js'
import { batchInsert } from './batchInsert.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Traces ingestion handler.
 * Auth is handled upstream by the catch-all gate — req.authWorkflowId is set.
 */
export default async function handler(req, res) {
  try {
    const authWorkflowId = req.authWorkflowId

    const { resourceSpans } = req.body
    if (!resourceSpans?.length) return res.status(200).json({ ok: true })

    const rows = []

    for (const rs of resourceSpans) {
      const resourceAttrs = rs.resource?.attributes || []
      const serviceName = findAttr(resourceAttrs, 'service.name')

      for (const ss of rs.scopeSpans || []) {
        for (const span of ss.spans || []) {
          const attrs = span.attributes || []

          const workflowId  = authWorkflowId
          const componentId = findAttr(attrs, 'component.id') || serviceName
          const entityId    = findAttr(attrs, 'entity.id')    || span.traceId

          // OTel status: 0=UNSET, 1=OK, 2=ERROR
          const status = span.status?.code === 2 ? 'critical' : 'healthy'

          // Nanoseconds → milliseconds
          let durationMs = 0
          try {
            if (span.endTimeUnixNano && span.startTimeUnixNano) {
              durationMs = Math.round(
                Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1000000
              )
            }
          } catch {
            durationMs = 0 // Gracefully handle BigInt conversion failures
          }

          if (!componentId) continue // skip malformed spans

          rows.push({
            workflow_id:  workflowId,
            component_id: componentId,
            entity_id:    entityId,
            status,
            duration_ms:  Number(durationMs),
            message:      span.name || '',
            span_id:      span.spanId,
            parent_span_id: span.parentSpanId || null
          })
        }
      }
    }

    const result = await batchInsert(supabase, 'events', rows, {
      route: 'otel-traces',
      workflow_id: authWorkflowId,
      raw_payload: req.body,
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[otel-traces] Unhandled error:', err)
    return res.status(500).json({ error: 'Internal traces ingestion error' })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
