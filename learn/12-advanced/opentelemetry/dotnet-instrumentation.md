# .NET OpenTelemetry Instrumentation

## The Concept

.NET has first-class OpenTelemetry support through NuGet packages. Instrumentation comes in two flavors:

1. **Auto-instrumentation** — Automatically captures HTTP requests, database queries, and runtime metrics with zero code changes
2. **Manual instrumentation** — Custom spans and metrics for domain-specific operations

### Setting Up in .NET

```csharp
// Program.cs or service configuration
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing =>
    {
        tracing
            .AddAspNetCoreInstrumentation()    // Incoming HTTP
            .AddHttpClientInstrumentation()     // Outgoing HTTP
            .AddOtlpExporter();                 // Export to collector
    })
    .WithMetrics(metrics =>
    {
        metrics
            .AddAspNetCoreInstrumentation()    // Request metrics
            .AddRuntimeInstrumentation()        // GC, threads, memory
            .AddOtlpExporter();
    });
```

## How DJ.ai Configures OpenTelemetry

### ServiceDefaults Project

DJ.ai's shared configuration lives in `DJai.ServiceDefaults/`, which is referenced by the OAuth proxy. This project sets up OpenTelemetry for all services:

```csharp
// Simplified from DJai.ServiceDefaults
public static IHostApplicationBuilder AddServiceDefaults(
    this IHostApplicationBuilder builder)
{
    builder.ConfigureOpenTelemetry();
    builder.AddDefaultHealthChecks();
    return builder;
}

public static IHostApplicationBuilder ConfigureOpenTelemetry(
    this IHostApplicationBuilder builder)
{
    builder.Logging.AddOpenTelemetry(logging =>
    {
        logging.IncludeFormattedMessage = true;
        logging.IncludeScopes = true;
    });

    builder.Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
        {
            metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation();
        })
        .WithTracing(tracing =>
        {
            tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation();
        });

    // Export to Application Insights via OTLP
    builder.Services.AddOpenTelemetry()
        .UseOtlpExporter();

    return builder;
}
```

### Auto-Instrumented Telemetry

With the configuration above, DJ.ai automatically captures:

| Source | Data |
|--------|------|
| `AddAspNetCoreInstrumentation` | Incoming HTTP requests (method, path, status, duration) |
| `AddHttpClientInstrumentation` | Outgoing HTTP calls to Spotify OAuth, Key Vault |
| `AddRuntimeInstrumentation` | GC collections, thread pool, memory allocation |

### Adding Custom Spans

For domain-specific operations, create manual spans:

```csharp
using var activity = ActivitySource.StartActivity("KeyVault.GetSecret");
activity?.SetTag("secret.name", secretName);

var secret = await _client.GetSecretAsync(secretName);

activity?.SetTag("secret.found", secret != null);
activity?.SetStatus(ActivityStatusCode.Ok);
```

### Aspire Dashboard Integration

During local development, .NET Aspire automatically collects OTel data and displays it in the Aspire Dashboard at `https://localhost:15888`:

```
Aspire Dashboard
├── Traces — See every OAuth request's span tree
├── Metrics — Request rates, latency percentiles
├── Logs — Structured log output from all services
└── Resources — Health and status of each service
```

## DJ.ai Connection

The `DJai.ServiceDefaults` project in the repository root configures OpenTelemetry for the OAuth proxy. During local development with `dotnet run` in `DJai.AppHost/`, telemetry flows to the Aspire Dashboard. In production, the OTLP exporter sends data to Azure Application Insights, configured via the Bicep infrastructure in `infra/core/monitoring.bicep`.

## Key Takeaways

- Auto-instrumentation captures HTTP, runtime, and dependency data with zero custom code
- Custom spans add domain context (Key Vault lookups, token exchange timing)
- The Aspire Dashboard provides local observability during development
- OTLP is the standard export format — works with any compatible backend

## Further Reading

- [.NET Observability with OpenTelemetry](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)
- [OpenTelemetry .NET Getting Started](https://opentelemetry.io/docs/languages/dotnet/getting-started/)
- [.NET Aspire Dashboard](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/dashboard/overview)
