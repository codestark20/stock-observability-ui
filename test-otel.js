const workflowId = "wf_1781669736070_wzctdg"; 
const componentId = "of_checkout";
const SECRET = "81b78b548e3fb0c466fa087d343d0b3f8efbaa86c49e93b3a0f655502cec8445";
const ENDPOINT = "https://stock-observability-ui.vercel.app/api/v1";

const commonTraceId = crypto.randomUUID().replace(/-/g, '');
const parentSpanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

// ── 1. Send a Trace ────────────────────────────────────────
const tracePayload = {
  resourceSpans: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "checkout-service" } }]
    },
    scopeSpans: [{
      spans: [
        {
          traceId: commonTraceId,
          spanId: parentSpanId,
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
        },
        {
          // Child span simulating a call to "payment-service"
          traceId: commonTraceId,
          spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
          parentSpanId: parentSpanId,
          name: "POST /api/payment",
          kind: 1,
          startTimeUnixNano: String((Date.now() + 10) * 1000000),
          endTimeUnixNano: String((Date.now() + 100) * 1000000),
          status: { code: 1 },
          attributes: [
            { key: "workflow.id", value: { stringValue: workflowId } },
            { key: "component.id", value: { stringValue: "of_payment" } }
          ]
        },
        {
          // A completely new, undiscovered child span calling "fraud-service"
          traceId: commonTraceId,
          spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
          parentSpanId: parentSpanId,
          name: "POST /api/fraud/verify",
          kind: 1,
          startTimeUnixNano: String((Date.now() + 15) * 1000000),
          endTimeUnixNano: String((Date.now() + 50) * 1000000),
          status: { code: 1 },
          attributes: [
            { key: "workflow.id", value: { stringValue: workflowId } },
            { key: "component.id", value: { stringValue: "of_fraud_check" } }
          ]
        },
        {
          // A completely new, undiscovered child span calling "inventory-service"
          traceId: commonTraceId,
          spanId: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
          parentSpanId: parentSpanId,
          name: "POST /api/inventory/check",
          kind: 1,
          startTimeUnixNano: String((Date.now() + 15) * 1000000),
          endTimeUnixNano: String((Date.now() + 50) * 1000000),
          status: { code: 1 },
          attributes: [
            { key: "workflow.id", value: { stringValue: workflowId } },
            { key: "component.id", value: { stringValue: "of_inventory" } }
          ]
        }
      ]
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

// ── 3. Send Logs ───────────────────────────────────────────
const severities = ["INFO", "WARN", "ERROR"];
const severity = severities[Math.floor(Math.random() * severities.length)];
const messages = {
  INFO: ["User completed checkout successfully", "Payment processing started", "Order validated"],
  WARN: ["API response time degraded", "Rate limit approaching", "Retrying failed connection"],
  ERROR: ["Database connection failed", "Invalid payment token", "Timeout waiting for inventory service"]
};
const message = messages[severity][Math.floor(Math.random() * 3)];

const logsPayload = {
  resourceLogs: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "checkout-service" } }]
    },
    scopeLogs: [{
      logRecords: [{
        timeUnixNano: String(Date.now() * 1000000),
        severityText: severity,
        body: { stringValue: message },
        attributes: [
          { key: "workflow.id", value: { stringValue: workflowId } },
          { key: "component.id", value: { stringValue: componentId } }
        ]
      }]
    }]
  }]
};

// ── Send all three ─────────────────────────────────────────
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

  // Send logs
  const logsRes = await fetch(`${ENDPOINT}/otel-logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-otel-secret': SECRET },
    body: JSON.stringify(logsPayload)
  });
  const logsResult = await logsRes.text();
  console.log(`  Logs:    ${logsRes.status === 200 ? '✅' : '❌'} ${logsResult}`);

  console.log(`\n  Latency: ${latency.toFixed(1)}ms | Throughput: ${throughput.toFixed(0)} req/s | CPU: ${cpu.toFixed(1)}%`);
  console.log(`  Log:     [${severity}] ${message}`);
  console.log("\nDone! Check your dashboard — the node should update with real chart data and logs.");
}

run().catch(err => console.error("Error:", err.message));
