# OpenTelemetry Concepts

## Traces and Spans

A **trace** represents a single request's journey through a system. It's composed of **spans** — timed operations that form a tree:

```
Trace: OAuth Token Exchange
├── Span: HTTP POST /oauth/spotify/exchange (250ms)
│   ├── Span: Validate device token (5ms)
│   ├── Span: Read client secret from Key Vault (45ms)
│   ├── Span: Exchange code at Spotify OAuth endpoint (180ms)
│   └── Span: Store token state in Redis (15ms)
```

Each span records:
- **Name** — What operation occurred
- **Start/End time** — How long it took
- **Status** — Success, error, or unset
- **Attributes** — Key-value metadata (`http.method: POST`, `provider: spotify`)
- **Parent span ID** — Links child spans to their parent

### Context Propagation

When a request crosses service boundaries, the trace context (trace ID, span ID) is propagated via HTTP headers (`traceparent`). This links spans from different services into a single distributed trace.

```
Client → [traceparent: 00-abc123-def456-01] → OAuth Proxy → Key Vault
```

## Metrics

Metrics are **aggregate measurements** collected over time. Unlike traces (per-request), metrics show trends:

| Metric Type | Description | Example |
|-------------|-------------|---------|
| **Counter** | Monotonically increasing count | Total requests, total errors |
| **Histogram** | Distribution of values | Request latency percentiles |
| **Gauge** | Current value | Active connections, memory usage |

```csharp
// Counter example
var requestCounter = meter.CreateCounter<long>("oauth.requests");
requestCounter.Add(1, new("provider", "spotify"), new("operation", "exchange"));

// Histogram example
var latencyHistogram = meter.CreateHistogram<double>("oauth.latency");
latencyHistogram.Record(elapsed.TotalMilliseconds, new("provider", "spotify"));
```

## Baggage

**Baggage** is key-value data propagated across service boundaries alongside trace context. Unlike span attributes (local to one span), baggage travels with the request:

```csharp
Baggage.SetBaggage("device.id", deviceToken);
// All downstream services can read this
```

## DJ.ai Connection

DJ.ai's `DJai.ServiceDefaults` project configures OpenTelemetry for the .NET backend. The SDK auto-instruments HTTP requests to the Function App and outbound calls to Key Vault and Google's OAuth endpoint. Custom metrics track per-provider request counts and latency. All telemetry exports to Application Insights via OTLP, accessible through the Azure portal or Aspire Dashboard during local development.

## Key Takeaways

- A trace is a tree of spans representing one request's journey
- Context propagation links spans across service boundaries via HTTP headers
- Metrics show aggregate trends; traces show individual request behavior
- Auto-instrumentation captures HTTP and runtime data; add custom spans for domain logic

## Further Reading

- [OpenTelemetry Concepts](https://opentelemetry.io/docs/concepts/)
- [OpenTelemetry .NET SDK](https://opentelemetry.io/docs/languages/dotnet/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
