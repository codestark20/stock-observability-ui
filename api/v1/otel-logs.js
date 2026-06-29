import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

import { resolveTenant } from '../_lib/resolveTenant'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-otel-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return res.status(401).json({ error: 'Invalid ingest secret' })
  }

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
          
          const workflowId = findAttr(attrs, 'workflow.id') || findAttr(resourceAttrs, 'workflow.id')
          const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id') || serviceName
          
          if (!workflowId || !componentId) continue

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
            tenant_id: tenant.tenantId,
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
        console.error('Supabase insert error:', error)
        return res.status(500).json({ error: error.message })
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
