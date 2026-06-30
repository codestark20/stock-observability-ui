import tracesHandler from '../../src/server/otel-traces.js'
import metricsHandler from '../../src/server/otel-metrics.js'
import logsHandler from '../../src/server/otel-logs.js'
import profilesHandler from '../../src/server/otel-profiles.js'

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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-otel-secret')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Route based on URL path
  const path = req.url.split('?')[0]
  
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
