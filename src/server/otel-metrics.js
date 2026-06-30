import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

import { resolveTenant } from '../_lib/resolveTenant'
import { checkRateLimit } from '../_lib/rateLimiter'
import { getLimits } from '../_lib/rateLimitConfig'

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-otel-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return res.status(401).json({ error: 'Invalid ingest secret' })
  }

  const limits = getLimits(tenant.plan, 'metrics');
  const { allowed, retryAfter } = checkRateLimit(tenant.tenantId, 'metrics', limits);
  
  if (!allowed) {
    supabase.from('rate_limit_breaches').insert({
      tenant_id: tenant.tenantId,
      endpoint: 'metrics',
      retry_after: retryAfter,
    }).then(() => {});

    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', limits.burst);
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfter });
  }

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
            const workflowId = findAttr(attrs, 'workflow.id') || findAttr(resourceAttrs, 'workflow.id')
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')

            if (!workflowId || !componentId) continue

            const value = dp.asDouble ?? dp.asInt ?? Number(dp.value) ?? 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              tenant_id: tenant.tenantId,
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
            const workflowId = findAttr(attrs, 'workflow.id') || findAttr(resourceAttrs, 'workflow.id')
            const componentId = findAttr(attrs, 'component.id') || findAttr(resourceAttrs, 'component.id')

            if (!workflowId || !componentId) continue

            // Use mean value (sum / count) for histograms
            const value = dp.count > 0 ? dp.sum / dp.count : 0
            const traceId = dp.exemplars?.[0]?.traceId || dp.exemplars?.[0]?.trace_id || null

            rows.push({
              tenant_id: tenant.tenantId,
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
        console.error('Supabase insert error:', error)
        return res.status(500).json({ error: error.message })
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
