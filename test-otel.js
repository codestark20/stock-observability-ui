const workflowId = "wf_1781669736070_wzctdg"; 
const componentId = "of_checkout";
const SECRET = "81b78b548e3fb0c466fa087d343d0b3f8efbaa86c49e93b3a0f655502cec8445";
const ENDPOINT = "https://stock-observability-ui.vercel.app/api/v1";

// ── 1. Send a Trace ────────────────────────────────────────
const tracePayload = {
  resourceSpans: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "checkout-service" } }]
    },
    scopeSpans: [{
      spans: [{
        traceId: crypto.randomUUID().replace(/-/g, ''),
        spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
        name: "POST /api/checkout",
        kind: 1,
        startTimeUnixNano: String(Date.now() * 1000000),
        endTimeUnixNano: String((Date.now() + 145) * 1000000),
        status: { code: 1 },
        attributes: [
          { key: "workflow.id", value: { stringValue: workflowId } },
          { key: "component.id", value: { stringValue: componentId } },
          { key: "entity.id", value: { stringValue: "ORD-" + Math.floor(Math.random() * 99999) } }
        ]
      }]
    }]
  }]
};

// ── 2. Send Metrics ────────────────────────────────────────
function makeGaugeMetric(name, value) {
  return {
    name,
    gauge: {
      dataPoints: [{
        asDouble: value,
        timeUnixNano: String(Date.now() * 1000000),
        attributes: [
          { key: "workflow.id", value: { stringValue: workflowId } },
          { key: "component.id", value: { stringValue: componentId } },
        ]
      }]
    }
  };
}

// Simulate realistic metric values
const latency = 20 + Math.random() * 80;       // 20-100ms
const throughput = 500 + Math.random() * 2000;  // 500-2500 req/s
const cpu = 15 + Math.random() * 50;            // 15-65%

const metricsPayload = {
  resourceMetrics: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "checkout-service" } }]
    },
    scopeMetrics: [{
      metrics: [
        makeGaugeMetric("latency_ms", latency),
        makeGaugeMetric("throughput_rps", throughput),
        makeGaugeMetric("cpu_percent", cpu),
      ]
    }]
  }]
};

// ── Send both ──────────────────────────────────────────────
async function run() {
  console.log("Sending trace + metrics to dashboard...\n");

  // Send trace
  const traceRes = await fetch(`${ENDPOINT}/otel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-otel-secret': SECRET },
    body: JSON.stringify(tracePayload)
  });
  const traceResult = await traceRes.text();
  console.log(`  Trace:   ${traceRes.status === 200 ? '✅' : '❌'} ${traceResult}`);

  // Send metrics
  const metricsRes = await fetch(`${ENDPOINT}/otel-metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-otel-secret': SECRET },
    body: JSON.stringify(metricsPayload)
  });
  const metricsResult = await metricsRes.text();
  console.log(`  Metrics: ${metricsRes.status === 200 ? '✅' : '❌'} ${metricsResult}`);

  console.log(`\n  Latency: ${latency.toFixed(1)}ms | Throughput: ${throughput.toFixed(0)} req/s | CPU: ${cpu.toFixed(1)}%`);
  console.log("\nDone! Check your dashboard — the node should update with real chart data.");
}

run().catch(err => console.error("Error:", err.message));
