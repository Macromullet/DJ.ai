# Azure Functions: Isolated Worker Model

## What Is the Isolated Worker?

Azure Functions has two hosting models:

| Model | Process | .NET Support | Status |
|-------|---------|-------------|--------|
| **In-process** | Shares host process | Tied to Functions runtime version | Legacy |
| **Isolated worker** | Separate .NET process | Any .NET version | Recommended |

The isolated worker runs your function code in its own process, communicating with the Azure Functions host via gRPC. This gives you full control over your application — dependency injection, middleware, and package versions are all yours.

## How It Works

```
┌─────────────────────┐    gRPC     ┌──────────────────────┐
│  Azure Functions     │ ◄────────► │  Your Worker Process  │
│  Host (runtime)      │            │  (.NET 8)             │
│                      │            │                       │
│  • Trigger binding   │            │  • Your function code │
│  • Scale control     │            │  • DI container       │
│  • Monitoring        │            │  • Custom middleware  │
└─────────────────────┘            └──────────────────────┘
```

## Setting Up an Isolated Worker

```csharp
// Program.cs
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()  // Isolated worker with ASP.NET Core integration
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();

        // Your DI registrations
        services.AddSingleton<ISecretService, KeyVaultSecretService>();
        services.AddHttpClient();
    })
    .Build();

host.Run();
```

The key method is `ConfigureFunctionsWebApplication()` — this sets up the isolated worker with ASP.NET Core integration, enabling features like `HttpRequestData` and `HttpResponseData`.

## Benefits of Isolation

1. **Independent .NET version** — use .NET 8 features without waiting for Functions runtime updates
2. **Full DI control** — register any service, use any lifetime
3. **Custom middleware** — add logging, auth, error handling to the pipeline
4. **Package freedom** — no version conflicts with the Functions SDK
5. **Better testing** — standard .NET testing patterns work naturally

## Required NuGet Packages

```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker" Version="2.*" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="2.*" />
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http.AspNetCore" Version="2.*" />
```

## Key Links

- [.NET Isolated Worker Guide](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- [Migrate to Isolated Worker](https://learn.microsoft.com/en-us/azure/azure-functions/migrate-dotnet-to-isolated-model)

## Key Takeaways

- Isolated worker is the **recommended model** for new Azure Functions projects
- Your code runs in a **separate process** — full control over DI, middleware, packages
- Use `ConfigureFunctionsWebApplication()` for ASP.NET Core integration
- The host communicates with your worker via **gRPC** — the boundary is transparent

## DJ.ai Connection

DJ.ai's `oauth-proxy/Program.cs` uses `ConfigureFunctionsWebApplication()` to set up the isolated worker. It also calls `.AddServiceDefaults()` from the `DJai.ServiceDefaults` project, which adds OpenTelemetry, health checks, and resilient HTTP client configuration. The isolated model allows DJ.ai to use .NET 8 features freely and register conditional service implementations (Key Vault vs local secrets vs stubs) without fighting the Functions runtime.
