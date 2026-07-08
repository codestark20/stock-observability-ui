import { createClient } from '@supabase/supabase-js'
import { batchInsert } from './batchInsert.js'

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

/**
 * Metrics ingestion handler.
 * Auth is handled upstream by the catch-all gate — req.authWorkflowId is set.
 */
export default async function handler(req, res) {
  try {
    const authWorkflowId = req.authWorkflowId

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
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')
            const instanceId = findAttr(resourceAttrs, 'service.instance.id') || findAttr(attrs, 'service.instance.id') || null

            if (!componentId) continue

            const value = dp.asDouble ?? dp.asInt ?? Number(dp.value) ?? 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              workflow_id: authWorkflowId,
              component_id: componentId,
              metric_name: normalizedName,
              value: Number(value),
              trace_id: traceId,
              instance_id: instanceId,
            })
          }

          // Handle histogram data points
          for (const dp of histogramPoints) {
            const attrs = dp.attributes || []
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')
            const instanceId = findAttr(resourceAttrs, 'service.instance.id') || findAttr(attrs, 'service.instance.id') || null

            if (!componentId) continue

            // Use mean value (sum / count) for histograms
            const value = dp.count > 0 ? dp.sum / dp.count : 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              workflow_id: authWorkflowId,
              component_id: componentId,
              metric_name: normalizedName,
              value: Number(value),
              trace_id: traceId,
              instance_id: instanceId,
            })
          }
        }
      }
    }

    const result = await batchInsert(supabase, 'metrics', rows, {
      route: 'otel-metrics',
      workflow_id: authWorkflowId,
      raw_payload: req.body,
    })

    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[otel-metrics] Unhandled error:', err)
    return res.status(500).json({ error: 'Internal metrics ingestion error' })
  }
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
