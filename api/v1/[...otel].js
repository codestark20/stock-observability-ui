import tracesHandler from '../../src/server/otel-traces.js'
import metricsHandler from '../../src/server/otel-metrics.js'
import logsHandler from '../../src/server/otel-logs.js'
import profilesHandler from '../../src/server/otel-profiles.js'
import { validatePayload } from '../../src/server/validatePayload.js'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024 // 10MB

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-otel-secret')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const path = req.url.split('?')[0]

  // ── Client-side error telemetry (no gates needed) ─────────
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

  // ── Determine pillar type from path ───────────────────────
  let pillarType = null
  let dispatchHandler = null

  if (path.includes('otel-metrics')) {
    pillarType = 'metrics'
    dispatchHandler = metricsHandler
  } else if (path.includes('otel-logs')) {
    pillarType = 'logs'
    dispatchHandler = logsHandler
  } else if (path.includes('otel-profiles')) {
    pillarType = 'profiles'
    dispatchHandler = profilesHandler
  } else if (path.includes('otel')) {
    pillarType = 'traces'
    dispatchHandler = tracesHandler
  } else {
    return res.status(404).json({ error: 'OTel endpoint not found' })
  }

  // ════════════════════════════════════════════════════════════
  //  SEQUENTIAL VALIDATION GATES
  // ════════════════════════════════════════════════════════════

  try {
    // ── Gate 1: Method Check ──────────────────────────────────
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed. Use POST.' })
    }

    // ── Gate 2: Payload Size Check → 413 ──────────────────────
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({
        error: 'Payload too large',
        message: `Request body exceeds ${MAX_PAYLOAD_BYTES / (1024 * 1024)}MB limit. Content-Length: ${contentLength} bytes.`,
      })
    }

    // ── Gate 3: Structural Validation → 422 ───────────────────
    const validation = validatePayload(pillarType, req.body)
    if (!validation.valid) {
      return res.status(422).json({
        error: 'Validation failed',
        message: `Malformed ${pillarType} payload`,
        details: validation.errors,
      })
    }

    // ── Gate 4: Auth Check → 401 ──────────────────────────────
    const apiKey = req.headers['x-api-key'] || req.headers['x-otel-secret']
    if (!apiKey) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Missing x-api-key or x-otel-secret header',
      })
    }

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const { data: workflowAuth, error: authError } = await supabase
      .from('workflows')
      .select('id')
      .eq('api_key', apiKey)
      .single()

    if (authError || !workflowAuth) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'The provided API key does not match any registered workflow',
      })
    }

    // Inject authenticated workflow ID onto request for downstream handlers
    req.authWorkflowId = workflowAuth.id

    // ── Gate 5: Dispatch to handler (insert + 207 partial-batch) ──
    return await dispatchHandler(req, res)

  } catch (err) {
    // Top-level catch: if anything above throws unexpectedly, return 500
    console.error(`[otel-gateway] Unhandled error in ${pillarType} pipeline:`, err)
    return res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred during telemetry processing',
    })
  }
}
