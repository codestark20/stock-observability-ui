import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const APP_URL = 'https://stock-observability-ui.vercel.app'

/**
 * POST a rich Slack notification via an Incoming Webhook URL.
 * Silently no-ops if webhookUrl is falsy.
 */
async function fireSlack(webhookUrl, { componentId, metricName, value, threshold, condition, severity, workflowId }) {
  if (!webhookUrl) return

  const conditionLabel = condition === 'gt' ? '>' : '<'
  const emoji = severity === 'critical' ? '🚨' : '⚠️'
  const color = severity === 'critical' ? '#e53e3e' : '#dd6b20'

  const payload = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: `${emoji} ${severity.toUpperCase()} — ${componentId}`, emoji: true }
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Metric:*\n\`${metricName}\`` },
              { type: 'mrkdwn', text: `*Value:*\n${value.toFixed(2)} (threshold: ${conditionLabel} ${threshold})` },
              { type: 'mrkdwn', text: `*Severity:*\n${severity}` },
              { type: 'mrkdwn', text: `*Time:*\n${new Date().toUTCString()}` },
            ]
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '→ Open Dashboard' },
                url: `${APP_URL}`,
                style: 'primary'
              }
            ]
          }
        ]
      }
    ]
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      console.warn(`[alert-engine] Slack webhook returned ${res.status} for component ${componentId}`)
    } else {
      console.log(`[alert-engine] Slack notification sent for ${componentId} (${metricName})`)
    }
  } catch (err) {
    console.error(`[alert-engine] Slack fetch failed: ${err.message}`)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const startTime = Date.now()
  const results = { evaluated: 0, fired: 0, skipped_cooldown: 0, errors: [] }

  try {
    // 1. Load all alert rules
    const { data: rules, error: rulesErr } = await supabase
      .from('alert_rules')
      .select('*')

    if (rulesErr) throw rulesErr
    if (!rules || rules.length === 0) {
      return res.status(200).json({ message: 'No alert rules configured', ...results })
    }

    const now = new Date()
    const windowStart = new Date(now.getTime() - 5 * 60 * 1000).toISOString() // last 5 min

    for (const rule of rules) {
      results.evaluated++

      try {
        // 2. Enforce cooldown
        if (rule.last_fired_at) {
          const lastFired = new Date(rule.last_fired_at)
          const cooldownMs = rule.cooldown_minutes * 60 * 1000
          if (now - lastFired < cooldownMs) {
            results.skipped_cooldown++
            continue
          }
        }

        // 3. Fetch recent metrics for this rule's metric_name + component
        const { data: metrics, error: metErr } = await supabase
          .from('metrics')
          .select('value, created_at')
          .eq('workflow_id', rule.workflow_id)
          .eq('component_id', rule.component_id)
          .eq('metric_name', rule.metric_name)
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false })
          .limit(100)

        if (metErr) {
          results.errors.push(`Rule ${rule.id}: ${metErr.message}`)
          continue
        }

        if (!metrics || metrics.length === 0) continue

        // 4. Calculate average value in the window
        const avg = metrics.reduce((sum, m) => sum + (Number(m.value) || 0), 0) / metrics.length

        // 5. Check threshold
        const breached = rule.condition === 'gt'
          ? avg > rule.threshold
          : avg < rule.threshold

        if (!breached) continue

        results.fired++

        // 6. Fire Slack notification (silently skips if no webhook configured)
        await fireSlack(rule.slack_webhook_url, {
          componentId: rule.component_id,
          metricName: rule.metric_name,
          value: avg,
          threshold: rule.threshold,
          condition: rule.condition,
          severity: rule.severity,
          workflowId: rule.workflow_id,
        })

        // 7. Insert into alerts table so dashboard shows the alert
        await supabase.from('alerts').insert({
          workflow_id: rule.workflow_id,
          component_id: rule.component_id,
          message: `[${rule.severity.toUpperCase()}] ${rule.metric_name} = ${avg.toFixed(2)} (threshold ${rule.condition === 'gt' ? '>' : '<'} ${rule.threshold})`,
          status: rule.severity,
          created_at: now.toISOString(),
        })

        // 8. Update last_fired_at to start cooldown
        await supabase
          .from('alert_rules')
          .update({ last_fired_at: now.toISOString() })
          .eq('id', rule.id)

        console.log(`[alert-engine] Rule fired: ${rule.component_id}/${rule.metric_name} avg=${avg.toFixed(2)} threshold=${rule.threshold}`)

      } catch (ruleErr) {
        results.errors.push(`Rule ${rule.id}: ${ruleErr.message}`)
        console.error(`[alert-engine] Error processing rule ${rule.id}:`, ruleErr.message)
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[alert-engine] Done in ${elapsed}ms — evaluated:${results.evaluated} fired:${results.fired} cooldowns:${results.skipped_cooldown}`)

    return res.status(200).json({
      success: true,
      elapsed_ms: elapsed,
      ...results
    })

  } catch (err) {
    console.error('[alert-engine] Fatal error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
