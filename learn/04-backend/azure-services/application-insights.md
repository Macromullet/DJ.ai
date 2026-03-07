# Application Insights & OpenTelemetry

## What Is Application Insights?

Application Insights is Azure's application performance monitoring (APM) service. It collects telemetry — requests, dependencies, exceptions, traces, and custom metrics — and provides dashboards, alerts, and distributed tracing across services.

DJ.ai uses OpenTelemetry as the instrumentation layer, which exports telemetry to Application Insights (in production) or the Aspire dashboard (in development).

## OpenTelemetry Architecture

```
┌──────────────────┐    OTLP Export    ┌────────────────────┐
│  Azure Functions  │ ────────────────► │ Application Insights│
│  (instrumented)   │                   │ (production)        │
│                   │    OTLP Export    ├────────────────────┤
│  • Traces         │ ────────────────► │ Aspire Dashboard    │
│  • Metrics        │                   │ (development)       │
│  • Logs           │                   └────────────────────┘
└──────────────────┘
```

## Configuration in DJ.ai

The `DJai.ServiceDefaults` project configures OpenTelemetry for the entire stack:

```csharp
// DJai.ServiceDefaults/Extensions.cs
services.AddOpenTelemetry()
    .WithMetrics(metrics =>
    {
        metrics.AddHttpClientInstrumentation()
            .AddRuntimeInstrumentation();
    })
    .WithTracing(tracing =>
    {
        tracing.AddSource(context.HostingEnvironment.ApplicationName)
            .AddHttpClientInstrumentation();
    });

// Export to OTLP collector (Aspire dashboard or Application Insights)
var useOtlpExporter = !string.IsNullOrWhiteSpace(
    context.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
if (useOtlpExporter)
{
    services.AddOpenTelemetry().UseOtlpExporter();
}
```

Application Insights integration is added in `Program.cs`:

```csharp
services.AddApplicationInsightsTelemetryWorkerService();
services.ConfigureFunctionsApplicationInsights();
```

## What Gets Collected

| Signal | Examples |
|--------|----------|
| **Traces** | OAuth initiate → Key Vault → token exchange → response |
| **Metrics** | Request count, latency, error rate per endpoint |
| **Logs** | Structured log messages with correlation IDs |
| **Dependencies** | Outbound calls to Key Vault, Redis, OAuth providers |

## Distributed Tracing

A single OAuth flow generates a trace that spans multiple services:

```
Client Request → Functions Host → Your Function
                                    ├── Key Vault GET (secret)
                                    ├── Redis SET (state)
                                    └── HTTP POST (Google OAuth)
```

Application Insights correlates all these operations with a single trace ID, making it easy to debug failures.

## Key Links

- [Application Insights Overview](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [OpenTelemetry for .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
- [Azure Functions Monitoring](https://learn.microsoft.com/en-us/azure/azure-functions/functions-monitoring)

## Key Takeaways

- **OpenTelemetry** is the instrumentation standard — vendor-neutral telemetry collection
- Application Insights is the **backend** that stores and visualizes telemetry
- Distributed tracing connects operations across services with **correlation IDs**
- `DJai.ServiceDefaults` configures telemetry **once** for the entire stack

## DJ.ai Connection

Telemetry configuration lives in `DJai.ServiceDefaults/Extensions.cs`, which is referenced by `oauth-proxy/Program.cs` via `.AddServiceDefaults()`. In development, the Aspire dashboard (https://localhost:15888) shows real-time traces, logs, and metrics. In production, Application Insights provides the same visibility in Azure Portal. The OpenTelemetry SDK automatically instruments HTTP client calls, so every outbound request to Google, Spotify, and Apple OAuth endpoints is traced without manual instrumentation.
