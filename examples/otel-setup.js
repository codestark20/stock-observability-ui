const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service', // fallback component_id
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());

// Usage Example
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service', '1.0.0');

async function processOrder(orderId, workflowId) {
  return tracer.startActiveSpan('process-order', async (span) => {
    try {
      span.setAttribute('workflow.id',  workflowId);
      span.setAttribute('component.id', 'order-service');
      span.setAttribute('entity.id',    orderId); // powers TraceTimelinePanel

      const result = await doWork(orderId);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.recordException(err);
      throw err;
    } finally {
      span.end(); // duration_ms is calculated automatically from this
    }
  });
}

async function doWork(orderId) {
  return new Promise(resolve => setTimeout(() => resolve(`Processed ${orderId}`), 100));
}
