import { createClient } from '@supabase/supabase-js'
import { classifySupabaseError } from '../../api/utils/supabaseErrorHandler.js'
import { writeDeadLetter, hashPayload } from '../../api/utils/deadLetter.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Standard metric name mapping — normalizes common OTel metric names
const METRIC_NAME_MAP = {
  'http.server.duration': 'latency_ms',
  'http.server.request.duration': 'latency_ms',
  'http.server.active_requests': 'throughput_rps',
  'http.server.request.count': 'throughput_rps',
  'process.cpu.utilization': 'cpu_percent',
  'system.cpu.utilization': 'cpu_percent',
  'http.server.request.error_rate': 'error_rate',
  // Allow direct names too
  'latency_ms': 'latency_ms',
  'throughput_rps': 'throughput_rps',
  'cpu_percent': 'cpu_percent',
  'error_rate': 'error_rate',
}

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
    const { resourceMetrics } = req.body
    if (!resourceMetrics?.length) return res.status(200).json({ ok: true })

    const rows = []

    for (const rm of resourceMetrics) {
      const resourceAttrs = rm.resource?.attributes || []

      for (const sm of rm.scopeMetrics || []) {
        for (const metric of sm.metrics || []) {
          const rawName = metric.name
          const normalizedName = METRIC_NAME_MAP[rawName] || rawName

          // Handle different metric data types (gauge, sum, histogram)
          const dataPoints = metric.gauge?.dataPoints
            || metric.sum?.dataPoints
            || []

          // For histograms, extract the mean (sum/count)
          const histogramPoints = metric.histogram?.dataPoints || []

          for (const dp of dataPoints) {
            const attrs = dp.attributes || []
            const workflowId = authWorkflowId;
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')

            if (!componentId) continue

            const value = dp.asDouble ?? dp.asInt ?? Number(dp.value) ?? 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              // tenant_id removed
              workflow_id: workflowId,
              component_id: componentId,
              metric_name: normalizedName,
              value: Number(value),
              trace_id: traceId,
            })
          }

          // Handle histogram data points
          for (const dp of histogramPoints) {
            const attrs = dp.attributes || []
            const workflowId = authWorkflowId;
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')

            if (!componentId) continue

            // Use mean value (sum / count) for histograms
            const value = dp.count > 0 ? dp.sum / dp.count : 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              workflow_id: workflowId,
              component_id: componentId,
              metric_name: normalizedName,
              value: Number(value),
              trace_id: traceId,
            })
          }
        }
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('metrics').insert(rows)
      if (error) {
        const classified = classifySupabaseError(error)
        console.error('[otel-metrics] Insert failed:', classified.error_class, error.message)

        // Write to dead-letter queue (fire-and-forget)
        const payloadHash = await hashPayload(JSON.stringify(req.body))
        writeDeadLetter({
          route: 'otel-metrics',
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
    console.error('Metrics ingestion error:', err)
    return res.status(500).json({ error: err.message })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
