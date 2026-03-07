# .NET Aspire

## Overview

.NET Aspire is a development platform for building distributed applications. It provides **local orchestration** — starting multiple services, containers, and frontends with a single command — plus a **dashboard** for monitoring traces, logs, and metrics.

For DJ.ai, Aspire replaces the need to manually start Redis, the Azure Functions backend, and the Vite dev server in separate terminals. One `dotnet run` does everything.

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Orchestration](./orchestration.md) | AppHost project and service registration |
| [Service Defaults](./service-defaults.md) | Shared configuration and health checks |
| [Gotchas](./gotchas.md) | Common issues and workarounds |

## The Aspire Stack

```
dotnet run (DJai.AppHost)
    │
    ├── Redis Container (port 6379)
    │   └── RedisInsight UI
    │
    ├── oauth-proxy (Azure Functions, port 7071)
    │   ├── References Redis
    │   └── Injects OAuth secrets
    │
    └── electron-app (Vite dev server, port 5173)
        └── References oauth-proxy URL
```

## The Dashboard

Aspire launches a dashboard at `https://localhost:15888` that shows:
- **Resources** — status of all services (running, stopped, errors)
- **Traces** — distributed traces across services
- **Logs** — structured logs with filtering
- **Metrics** — runtime metrics (requests, memory, GC)

## Key Links

- [.NET Aspire Documentation](https://learn.microsoft.com/en-us/dotnet/aspire/)
- [Getting Started](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/build-your-first-aspire-app)

## DJ.ai Connection

Aspire is the recommended way to start DJ.ai's development environment: `cd DJai.AppHost && dotnet run`. The AppHost project (`DJai.AppHost/`) registers all services with their dependencies and configuration. The ServiceDefaults project (`DJai.ServiceDefaults/`) provides shared OpenTelemetry, health checks, and resilient HTTP client configuration. The Aspire dashboard gives immediate visibility into OAuth flows, Redis operations, and service health.
