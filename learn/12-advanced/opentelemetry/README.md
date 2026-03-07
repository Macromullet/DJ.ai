# OpenTelemetry

## The Concept

**OpenTelemetry (OTel)** is a vendor-neutral observability framework for generating, collecting, and exporting telemetry data — traces, metrics, and logs. It answers the question: "What is my application doing in production?"

### The Three Pillars of Observability

| Pillar | What It Tells You | Example |
|--------|-------------------|---------|
| **Traces** | How a request flows through services | OAuth exchange → Key Vault → token response |
| **Metrics** | Aggregate measurements over time | Requests/second, error rate, latency P99 |
| **Logs** | Discrete events with context | "Token refresh failed for device abc-123" |

### Why OpenTelemetry?

Before OTel, each vendor had its own SDK — switching from Datadog to Application Insights meant rewriting instrumentation. OTel provides a single API that exports to **any backend**: Application Insights, Jaeger, Zipkin, Prometheus, Datadog, Grafana, etc.

## OpenTelemetry in DJ.ai

DJ.ai uses OTel to instrument the .NET backend (OAuth proxy) and exports to Azure Application Insights via the OTLP (OpenTelemetry Protocol) exporter.

### Architecture

```
OAuth Proxy (Azure Functions)
  ├── Auto-instrumented: HTTP requests, .NET runtime metrics
  ├── Custom spans: Key Vault operations, token exchange timing
  └── Exports via OTLP → Application Insights
                             ├── Traces (distributed tracing)
                             ├── Metrics (request rates, latency)
                             └── Logs (structured logging)
```

## Learning Path

| File | Topic |
|------|-------|
| [concepts.md](./concepts.md) | Traces, spans, metrics, context propagation |
| [dotnet-instrumentation.md](./dotnet-instrumentation.md) | .NET auto and manual instrumentation |

## Key Takeaways

- OpenTelemetry is the industry standard for vendor-neutral observability
- Auto-instrumentation captures HTTP requests and runtime metrics for free
- Custom spans add domain-specific timing (Key Vault lookups, token exchanges)
- Invest in observability early — debugging production issues without it is painful

## Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OpenTelemetry .NET](https://opentelemetry.io/docs/languages/dotnet/)
