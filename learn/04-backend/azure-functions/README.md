# Azure Functions

## Overview

Azure Functions is Microsoft's serverless compute platform — you write functions that respond to events (HTTP requests, timers, queue messages), and Azure handles scaling, infrastructure, and billing. DJ.ai uses Azure Functions for its OAuth proxy because:

1. **Pay-per-execution** — the backend handles infrequent OAuth operations, not constant traffic
2. **Auto-scaling** — scales to zero when idle, scales up during auth spikes
3. **Simple deployment** — single project, no web server configuration
4. **Azure integration** — native Key Vault, Redis, and Managed Identity support

## Isolated Worker Model

DJ.ai uses the **isolated worker model**, which runs your function code in a separate .NET process from the Azure Functions host. This provides:

- Full control over dependency injection
- Use of any .NET version (not tied to Functions runtime)
- Better middleware and request pipeline customization
- Independent package versions

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Isolated Worker](./isolated-worker.md) | How the isolated process model works |
| [HTTP Triggers](./http-triggers.md) | Handling HTTP requests and routing |
| [Local Development](./local-development.md) | Running functions locally with Core Tools |

## DJ.ai's Function Endpoints

| Function Class | Routes | Provider |
|---------------|--------|----------|
| `SpotifyOAuthFunctions` | `/api/oauth/spotify/{initiate,exchange,refresh}` | Spotify |
| `AppleMusicOAuthFunctions` | `/api/oauth/apple/{initiate,developer-token,validate}` | Apple Music |
| `HealthCheckFunction` | `/api/health` | (diagnostics) |

## Key Links

- [Azure Functions Overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview)
- [.NET Isolated Worker Guide](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)

## DJ.ai Connection

The Azure Functions project lives in `oauth-proxy/`. It's deliberately thin — three function classes, four service interfaces, and a handful of DTOs. Each provider's functions follow the same pattern: validate device token, check rate limit, fetch client secret from Key Vault, call the provider's OAuth endpoint, return tokens. The `HealthCheckFunction` verifies Key Vault connectivity. Locally, functions run via `func start --port 7071` or through Aspire orchestration.
