import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      error_class = 'unknown',
      error_message = '',
      stack = null,
      route = '/',
    } = req.body || {}

    // Insert into the logs table under reserved platform IDs
    // This lets the dashboard observe itself in the NodeDetailPanel
    await supabase.from('logs').insert({
      workflow_id: '__platform__',
      component_id: '__client__',
      severity_text: 'ERROR',
      body: `[${error_class}] ${error_message}`.slice(0, 1000),
      attributes: {
        error_class,
        stack: stack ? String(stack).slice(0, 500) : null,
        route,
        source: 'browser',
      },
      timestamp: new Date().toISOString(),
    })

    return res.status(204).end()
  } catch (err) {
    // Never expose internal errors from the error collector itself
    console.error('[client-errors] Failed to record client error:', err.message)
    return res.status(204).end()
  }
}
