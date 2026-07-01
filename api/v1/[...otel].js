import tracesHandler from '../../src/server/otel-traces.js'
import metricsHandler from '../../src/server/otel-metrics.js'
import logsHandler from '../../src/server/otel-logs.js'
import profilesHandler from '../../src/server/otel-profiles.js'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  // CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-otel-secret')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Route based on URL path
  const path = req.url.split('?')[0]

  // ── Client-side error telemetry ────────────────────────────
  // Inlined here to stay within Vercel's 12-function limit.
  if (path.includes('client-errors')) {
    if (req.method !== 'POST') return res.status(405).end()
    try {
      const { error_class = 'unknown', error_message = '', stack = null, route = '/' } = req.body || {}
      const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await supabase.from('logs').insert({
        workflow_id: '__platform__',
        component_id: '__client__',
        severity_text: 'ERROR',
        body: `[${error_class}] ${error_message}`.slice(0, 1000),
        attributes: { error_class, stack: stack ? String(stack).slice(0, 500) : null, route, source: 'browser' },
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[client-errors] Failed to record:', err.message)
    }
    return res.status(204).end()
  }

  // ── OTel ingestion routes ──────────────────────────────────
  if (path.includes('otel-metrics')) {
    return metricsHandler(req, res)
  }
  
  if (path.includes('otel-logs')) {
    return logsHandler(req, res)
  }
  
  if (path.includes('otel-profiles')) {
    return profilesHandler(req, res)
  }
  
  if (path.includes('otel')) {
    // Default to traces for `/api/v1/otel`
    return tracesHandler(req, res)
  }
  
  return res.status(404).json({ error: 'OTel endpoint not found' })
}
