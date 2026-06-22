import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const OTEL_SECRET = process.env.OTEL_INGEST_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-otel-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (OTEL_SECRET && req.headers['x-otel-secret'] !== OTEL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { resourceSpans } = req.body;
  if (!resourceSpans?.length) return res.status(200).json({ ok: true });

  const rows = [];

  for (const rs of resourceSpans) {
    const resourceAttrs = rs.resource?.attributes || [];
    const serviceName = findAttr(resourceAttrs, 'service.name');

    for (const ss of rs.scopeSpans || []) {
      for (const span of ss.spans || []) {
        const attrs = span.attributes || [];

        const workflowId  = findAttr(attrs, 'workflow.id');
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

        if (!workflowId || !componentId) continue; // skip malformed spans

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
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: error.message });
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
