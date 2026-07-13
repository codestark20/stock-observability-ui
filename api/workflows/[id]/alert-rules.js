import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { id: workflowId } = req.query
  if (!workflowId) return res.status(400).json({ error: 'workflow id is required' })

  try {
    // ── GET — list all alert rules for this workflow ──────────────
    if (req.method === 'GET') {
      const { componentId } = req.query
      let query = supabase
        .from('alert_rules')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })

      if (componentId) query = query.eq('component_id', componentId)

      const { data, error } = await query
      if (error) throw error
      return res.status(200).json({ rules: data || [] })
    }

    // ── POST — create a new alert rule ────────────────────────────
    if (req.method === 'POST') {
      const {
        component_id,
        metric_name,
        threshold,
        condition = 'gt',
        severity = 'warning',
        slack_webhook_url,
        cooldown_minutes = 15,
      } = req.body

      if (!component_id || !metric_name || threshold === undefined) {
        return res.status(400).json({
          error: 'component_id, metric_name, and threshold are required'
        })
      }

      if (!['gt', 'lt'].includes(condition)) {
        return res.status(400).json({ error: 'condition must be "gt" or "lt"' })
      }

      if (!['warning', 'critical'].includes(severity)) {
        return res.status(400).json({ error: 'severity must be "warning" or "critical"' })
      }

      const { data, error } = await supabase
        .from('alert_rules')
        .insert({
          workflow_id: workflowId,
          component_id,
          metric_name,
          threshold: Number(threshold),
          condition,
          severity,
          slack_webhook_url: slack_webhook_url || null,
          cooldown_minutes: Number(cooldown_minutes) || 15,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return res.status(201).json({ rule: data })
    }

    // ── DELETE — remove a specific rule ───────────────────────────
    if (req.method === 'DELETE') {
      const { ruleId } = req.query
      if (!ruleId) return res.status(400).json({ error: 'ruleId query param is required' })

      const { error } = await supabase
        .from('alert_rules')
        .delete()
        .eq('id', ruleId)
        .eq('workflow_id', workflowId) // safety: only delete from this workflow

      if (error) throw error
      return res.status(200).json({ success: true, deleted_id: ruleId })
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` })

  } catch (err) {
    console.error(`[alert-rules] Error for workflow ${workflowId}:`, err.message)
    return res.status(500).json({ error: err.message })
  }
}
