import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
if (endpoint) {
  const exporter = new OTLPTraceExporter({ url: endpoint });
  const sdk = new NodeSDK({ traceExporter: exporter, instrumentations: [getNodeAutoInstrumentations()] });
  sdk.start();
}
