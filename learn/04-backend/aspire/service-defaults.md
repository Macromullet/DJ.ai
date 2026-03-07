# Aspire Service Defaults

## What Are Service Defaults?

The ServiceDefaults project provides **shared infrastructure configuration** that all services in the Aspire application inherit. Instead of configuring OpenTelemetry, health checks, and HTTP resilience in every project, you configure it once in ServiceDefaults.

## DJ.ai's ServiceDefaults

```csharp
// DJai.ServiceDefaults/Extensions.cs

// Overload for IHostBuilder (Azure Functions)
public static IHostBuilder AddServiceDefaults(this IHostBuilder builder)
{
    builder.ConfigureLogging(logging =>
    {
        logging.AddOpenTelemetry(otel =>
        {
            otel.IncludeFormattedMessage = true;
            otel.IncludeScopes = true;
        });
    });

    builder.ConfigureServices((context, services) =>
    {
        // Health checks
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), ["live"]);

        // Service discovery
        services.AddServiceDiscovery();

        // OpenTelemetry (traces + metrics)
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

        // OTLP exporter (Aspire dashboard or Application Insights)
        var useOtlpExporter = !string.IsNullOrWhiteSpace(
            context.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]);
        if (useOtlpExporter)
        {
            services.AddOpenTelemetry().UseOtlpExporter();
        }

        // Resilient HTTP clients
        services.ConfigureHttpClientDefaults(http =>
        {
            http.AddStandardResilienceHandler();
            http.AddServiceDiscovery();
        });
    });

    return builder;
}
```

## What It Configures

| Feature | Purpose |
|---------|---------|
| **OpenTelemetry Logging** | Structured logs with correlation IDs |
| **OpenTelemetry Tracing** | Distributed traces across services |
| **OpenTelemetry Metrics** | HTTP client and runtime metrics |
| **Health Checks** | `/health` and `/alive` endpoints |
| **Service Discovery** | Resolve service URLs by name |
| **Resilient HTTP** | Retries, circuit breakers, timeouts |

## How Services Use It

```csharp
// oauth-proxy/Program.cs
var host = new HostBuilder()
    .AddServiceDefaults()  // One line adds everything above
    .ConfigureFunctionsWebApplication()
    .ConfigureServices(/* app-specific services */)
    .Build();
```

## Standard Resilience Handler

The `AddStandardResilienceHandler()` adds a pre-configured Polly pipeline:

- **Retry**: 3 attempts with exponential backoff
- **Circuit breaker**: Opens after consecutive failures, prevents cascade
- **Timeout**: Per-request and total timeout limits
- **Rate limiting**: Prevents overwhelming downstream services

This means every `HttpClient` in the application automatically gets production-grade resilience.

## Key Links

- [Service Defaults](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/service-defaults)
- [Standard Resilience Handler](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)
- [OpenTelemetry in .NET](https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel)

## Key Takeaways

- ServiceDefaults is a **shared project** referenced by all services
- **One line** (`.AddServiceDefaults()`) adds telemetry, health, resilience, and discovery
- The standard resilience handler provides **retries and circuit breakers** by default
- Two `IHostBuilder` overloads: one for ASP.NET Core apps, one for Azure Functions (IHostBuilder)

## DJ.ai Connection

DJ.ai's `DJai.ServiceDefaults/Extensions.cs` provides two overloads of `AddServiceDefaults()` — one for `IHostApplicationBuilder` (standard ASP.NET Core) and one for `IHostBuilder` (Azure Functions isolated worker). The oauth-proxy uses the `IHostBuilder` version. The OTLP exporter sends telemetry to the Aspire dashboard during development (auto-configured via `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable) and to Application Insights in production. The resilient HTTP configuration ensures that token exchange calls to Google, Spotify, and Apple automatically retry on transient failures.
