const SECRET = "81b78b548e3fb0c466fa087d343d0b3f8efbaa86c49e93b3a0f655502cec8445";
const ENDPOINT = "https://stock-observability-ui.vercel.app/api/v1";

// ── All 4 Workflows with their components ──────────────────
const workflows = [
  {
    id: "wf_1781669736070_wzctdg",
    name: "Order Fulfillment Pipeline",
    components: [
      { id: "of_checkout",  service: "checkout-service",  baseLat: 45,  baseTps: 1200, baseCpu: 32 },
      { id: "of_inventory", service: "inventory-service", baseLat: 75,  baseTps: 800,  baseCpu: 58 },
      { id: "of_payment",   service: "payment-service",   baseLat: 40,  baseTps: 1500, baseCpu: 25 },
      { id: "of_shipping",  service: "shipping-service",  baseLat: 60,  baseTps: 600,  baseCpu: 35 },
      { id: "of_notify",    service: "notify-service",    baseLat: 30,  baseTps: 2000, baseCpu: 48 },
    ]
  },
  {
    id: "wf_1781669734899_2xclwd",
    name: "Employee Onboarding",
    components: [
      { id: "demo_hr",      service: "hr-portal",         baseLat: 83,  baseTps: 480,  baseCpu: 38 },
      { id: "demo_google",  service: "google-workspace",  baseLat: 55,  baseTps: 200,  baseCpu: 35 },
      { id: "demo_company", service: "company-id-system", baseLat: 59,  baseTps: 240,  baseCpu: 39 },
      { id: "demo_pf",      service: "pf-registration",   baseLat: 51,  baseTps: 160,  baseCpu: 31 },
      { id: "demo_it",      service: "it-setup",          baseLat: 76,  baseTps: 410,  baseCpu: 31 },
    ]
  },
  {
    id: "wf_1782107133849_buhikj",
    name: "User Authentication Flow",
    components: [
      { id: "comp_1782107133849_b94ibu", service: "web-frontend",   baseLat: 52, baseTps: 1700, baseCpu: 32 },
      { id: "comp_1782107133849_t5ucqs", service: "auth-gateway",   baseLat: 27, baseTps: 3200, baseCpu: 62 },
      { id: "comp_1782107133849_o1fth9", service: "user-database",  baseLat: 34, baseTps: 3900, baseCpu: 69 },
      { id: "comp_1782107133849_cmojgu", service: "email-service",  baseLat: 31, baseTps: 3600, baseCpu: 66 },
    ]
  },
  {
    id: "wf_1782107133849_verz2d",
    name: "Data Ingestion Pipeline",
    components: [
      { id: "comp_1782107133849_0c9bq0", service: "data-collector", baseLat: 66, baseTps: 3100, baseCpu: 46 },
      { id: "comp_1782107133849_4b9kb4", service: "kafka-stream",   baseLat: 27, baseTps: 3200, baseCpu: 62 },
      { id: "comp_1782107133849_vajugp", service: "spark-processor",baseLat: 45, baseTps: 1000, baseCpu: 25 },
      { id: "comp_1782107133849_khr92b", service: "snowflake-dw",   baseLat: 24, baseTps: 2900, baseCpu: 59 },
    ]
  },
];

const logMessages = {
  INFO:  ["Request processed successfully", "Health check passed", "Cache refreshed", "Connection pool stable", "Batch job completed"],
  WARN:  ["Response time degraded", "Rate limit approaching", "Retrying failed connection", "Memory usage high", "Queue depth increasing"],
  ERROR: ["Database connection failed", "Invalid token received", "Timeout waiting for downstream", "Disk space critical", "Circuit breaker tripped"],
};

const severities = ["INFO", "INFO", "INFO", "WARN", "ERROR"];

function jitter(base, pct = 0.3) {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}

function buildTracePayload(wf) {
  const commonTraceId = crypto.randomUUID().replace(/-/g, '');
  const entityId = "ENT-" + Math.floor(Math.random() * 99999);
  let parentSpanId = null;

  const allSpans = wf.components.map((comp, i) => {
    const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    const startOffset = i * 50;
    const duration = 20 + Math.random() * 80;

    const span = {
      traceId: commonTraceId,
      spanId,
      name: `${comp.service}/process`,
      kind: 1,
      startTimeUnixNano: String((Date.now() + startOffset) * 1000000),
      endTimeUnixNano: String((Date.now() + startOffset + duration) * 1000000),
      status: { code: 1 },
      attributes: [
        { key: "workflow.id", value: { stringValue: wf.id } },
        { key: "component.id", value: { stringValue: comp.id } },
        { key: "entity.id", value: { stringValue: entityId } },
      ]
    };
    if (parentSpanId) span.parentSpanId = parentSpanId;
    parentSpanId = spanId;
    return span;
  });

  return {
    resourceSpans: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: wf.name.toLowerCase().replace(/\s+/g, '-') } }] },
      scopeSpans: [{ spans: allSpans }]
    }]
  };
}

function buildMetricsPayload(wf) {
  const allMetrics = [];
  for (const comp of wf.components) {
    for (const m of [
      { name: "latency_ms",     value: jitter(comp.baseLat) },
      { name: "throughput_rps", value: jitter(comp.baseTps) },
      { name: "cpu_percent",    value: jitter(comp.baseCpu) },
    ]) {
      allMetrics.push({
        name: m.name,
        gauge: {
          dataPoints: [{
            asDouble: m.value,
            timeUnixNano: String(Date.now() * 1000000),
            attributes: [
              { key: "workflow.id", value: { stringValue: wf.id } },
              { key: "component.id", value: { stringValue: comp.id } },
            ]
          }]
        }
      });
    }
  }
  return {
    resourceMetrics: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: wf.name.toLowerCase().replace(/\s+/g, '-') } }] },
      scopeMetrics: [{ metrics: allMetrics }]
    }]
  };
}

function buildLogsPayload(wf) {
  const commonTraceId = crypto.randomUUID().replace(/-/g, '');
  const allLogs = wf.components.map(comp => {
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const msgs = logMessages[severity];
    const message = msgs[Math.floor(Math.random() * msgs.length)];
    return {
      timeUnixNano: String(Date.now() * 1000000),
      severityText: severity,
      body: { stringValue: `[${comp.service}] ${message}` },
      traceId: commonTraceId,
      spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
      attributes: [
        { key: "workflow.id", value: { stringValue: wf.id } },
        { key: "component.id", value: { stringValue: comp.id } },
      ]
    };
  });
  return {
    resourceLogs: [{
      resource: { attributes: [{ key: "service.name", value: { stringValue: wf.name.toLowerCase().replace(/\s+/g, '-') } }] },
      scopeLogs: [{ logRecords: allLogs }]
    }]
  };
}

// ── Send everything ────────────────────────────────────────
async function sendBatch(batchNum) {
  const headers = { 'Content-Type': 'application/json', 'x-otel-secret': SECRET };
  let totalTraces = 0, totalMetrics = 0, totalLogs = 0;

  for (const wf of workflows) {
    const [traceRes, metricsRes, logsRes] = await Promise.all([
      fetch(`${ENDPOINT}/otel`,         { method: 'POST', headers, body: JSON.stringify(buildTracePayload(wf)) }),
      fetch(`${ENDPOINT}/otel-metrics`, { method: 'POST', headers, body: JSON.stringify(buildMetricsPayload(wf)) }),
      fetch(`${ENDPOINT}/otel-logs`,    { method: 'POST', headers, body: JSON.stringify(buildLogsPayload(wf)) }),
    ]);

    const t = await traceRes.json().catch(() => ({}));
    const m = await metricsRes.json().catch(() => ({}));
    const l = await logsRes.json().catch(() => ({}));

    totalTraces += t.inserted || 0;
    totalMetrics += m.inserted || 0;
    totalLogs += l.inserted || 0;
  }

  console.log(`  Batch ${String(batchNum).padStart(2)}: Traces ✅ ${totalTraces} | Metrics ✅ ${totalMetrics} | Logs ✅ ${totalLogs}`);
}

async function run() {
  const BATCHES = 10;
  const DELAY_MS = 2000;

  const totalComponents = workflows.reduce((sum, wf) => sum + wf.components.length, 0);

  console.log(`\n🚀 Sending ${BATCHES} batches across ALL ${workflows.length} workflows (${totalComponents} components)\n`);
  for (const wf of workflows) {
    console.log(`   📋 ${wf.name} (${wf.components.length} components)`);
  }
  console.log('');

  for (let i = 1; i <= BATCHES; i++) {
    await sendBatch(i);
    if (i < BATCHES) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const expectedTraces = BATCHES * totalComponents;
  const expectedMetrics = BATCHES * totalComponents * 3;
  const expectedLogs = BATCHES * totalComponents;

  console.log(`\n✨ Done! Sent ~${expectedTraces} traces, ~${expectedMetrics} metrics, ~${expectedLogs} logs.`);
  console.log("   Open any workflow and click any component to see charts and logs!\n");
}

run().catch(err => console.error("Error:", err.message));
