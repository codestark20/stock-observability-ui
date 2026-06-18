# pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
import time

resource = Resource.create({"service.name": "payment-service"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

def process_payment(payment_id: str, workflow_id: str):
    with tracer.start_as_current_span("process-payment") as span:
        try:
            span.set_attribute("workflow.id",  workflow_id)
            span.set_attribute("component.id", "payment-service")
            span.set_attribute("entity.id",    payment_id)
            
            # ... business logic ...
            time.sleep(0.1)
            
            span.set_status(trace.StatusCode.OK)
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise
