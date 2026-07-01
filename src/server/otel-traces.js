import { createClient } from '@supabase/supabase-js'
import { classifySupabaseError } from '../lib/supabaseErrorHandler.js'
import { writeDeadLetter, hashPayload } from '../lib/deadLetter.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-otel-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const { resourceSpans } = req.body;
  if (!resourceSpans?.length) return res.status(200).json({ ok: true });

  const rows = [];

  for (const rs of resourceSpans) {
    const resourceAttrs = rs.resource?.attributes || [];
    const serviceName = findAttr(resourceAttrs, 'service.name');

    for (const ss of rs.scopeSpans || []) {
      for (const span of ss.spans || []) {
        const attrs = span.attributes || [];

        const workflowId  = authWorkflowId;
        const componentId = findAttr(attrs, 'component.id') || serviceName;
        const entityId    = findAttr(attrs, 'entity.id')    || span.traceId;

        // OTel status: 0=UNSET, 1=OK, 2=ERROR
        const status = span.status?.code === 2 ? 'critical' : 'healthy';

        // Nanoseconds → milliseconds
        const durationMs = span.endTimeUnixNano && span.startTimeUnixNano
          ? Math.round(
              Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano))
              / 1000000
            )
          : 0;

        if (!componentId) continue; // skip malformed spans

        rows.push({
          workflow_id:  workflowId,
          component_id: componentId,
          entity_id:    entityId,
          status,
          duration_ms:  Number(durationMs),
          message:      span.name || '',
          span_id:      span.spanId,
          parent_span_id: span.parentSpanId || null
        });
      }
    }
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('events').insert(rows);
    if (error) {
      const classified = classifySupabaseError(error);
      console.error('[otel-traces] Insert failed:', classified.error_class, error.message);

      // Write to dead-letter queue (fire-and-forget)
      const payloadHash = await hashPayload(JSON.stringify(req.body));
      writeDeadLetter({
        route: 'otel-traces',
        error_class: classified.error_class,
        error_message: classified.message,
        span_count: rows.length,
        workflow_id: authWorkflowId,
        payload_hash: payloadHash,
      });

      return res.status(classified.status).json({ error: classified.message });
    }
  }

  return res.status(200).json({ ok: true, inserted: rows.length });
}

function findAttr(attrs, key) {
  const a = attrs.find(a => a.key === key);
  if (!a) return null;
  const v = a.value;
  return v.stringValue ?? v.intValue ?? v.boolValue ?? null;
}
