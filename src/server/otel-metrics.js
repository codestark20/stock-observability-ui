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

    // Fire alert evaluation in the background (non-blocking).
    // We deliberately do NOT await this — it runs concurrently while we respond.
    if (rows.length > 0) {
      const componentIds = [...new Set(rows.map(r => r.component_id))]
      evaluateAlertsForComponents(authWorkflowId, componentIds).catch(err =>
        console.error('[otel-metrics] Alert evaluation error:', err.message)
      )
    }

    return res.status(result.status).json(result.body)
  } catch (err) {
    console.error('[otel-metrics] Unhandled error:', err)
    return res.status(500).json({ error: 'Internal metrics ingestion error' })
  }
}

/**
 * Evaluate alert rules for specific components after new metrics arrive.
 * Only checks rules for the components that just reported metrics — fast and targeted.
 */
async function evaluateAlertsForComponents(workflowId, componentIds) {
  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('workflow_id', workflowId)
    .in('component_id', componentIds)

  if (!rules || rules.length === 0) return

  const now = new Date()
  const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString()

  for (const rule of rules) {
    try {
      // Enforce cooldown
      if (rule.last_fired_at) {
        const lastFired = new Date(rule.last_fired_at)
        if (now - lastFired < rule.cooldown_minutes * 60 * 1000) continue
      }

      // Get recent metric values for this rule
      const { data: metrics } = await supabase
        .from('metrics')
        .select('value')
        .eq('workflow_id', workflowId)
        .eq('component_id', rule.component_id)
        .eq('metric_name', rule.metric_name)
        .gte('created_at', windowStart)
        .limit(100)

      if (!metrics || metrics.length === 0) continue

      const avg = metrics.reduce((s, m) => s + Number(m.value), 0) / metrics.length
      const breached = rule.condition === 'gt' ? avg > rule.threshold : avg < rule.threshold

      if (!breached) continue

      // Fire Slack if webhook is configured
      if (rule.slack_webhook_url) {
        const condLabel = rule.condition === 'gt' ? '>' : '<'
        const emoji = rule.severity === 'critical' ? '🚨' : '⚠️'
        const color = rule.severity === 'critical' ? '#e53e3e' : '#dd6b20'
        await fetch(rule.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachments: [{
              color,
              blocks: [
                { type: 'header', text: { type: 'plain_text', text: `${emoji} ${rule.severity.toUpperCase()} — ${rule.component_id}`, emoji: true } },
                { type: 'section', fields: [
                  { type: 'mrkdwn', text: `*Metric:*\n\`${rule.metric_name}\`` },
                  { type: 'mrkdwn', text: `*Value:*\n${avg.toFixed(2)} (threshold ${condLabel} ${rule.threshold})` },
                ]},
                { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: '→ Open Dashboard' }, url: 'https://stock-observability-ui.vercel.app', style: 'primary' }] }
              ]
            }]
          })
        }).catch(() => {})
      }

      // Record in alerts table so dashboard shows it
      await supabase.from('alerts').insert({
        workflow_id: workflowId,
        component_id: rule.component_id,
        message: `[${rule.severity.toUpperCase()}] ${rule.metric_name} = ${avg.toFixed(2)} (threshold ${rule.condition === 'gt' ? '>' : '<'} ${rule.threshold})`,
        status: rule.severity,
        created_at: now.toISOString(),
      })

      // Update cooldown
      await supabase.from('alert_rules').update({ last_fired_at: now.toISOString() }).eq('id', rule.id)
      console.log(`[alert-engine] Fired: ${rule.component_id}/${rule.metric_name} avg=${avg.toFixed(2)}`)
    } catch (err) {
      console.error(`[alert-engine] Rule ${rule.id} error:`, err.message)
    }
  }
}


function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key)
  if (!a) return null
  const v = a.value
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null
}
