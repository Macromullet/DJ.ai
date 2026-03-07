# Azure Services

## Overview

DJ.ai uses a focused set of Azure services to support its OAuth-only backend. Each service serves a specific purpose in the security and operations pipeline:

```
┌────────────────────────────────────────────────┐
│                Azure Services                   │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Key Vault   │  │  Managed Identity     │    │
│  │  (secrets)   │◄─│  (authentication)     │    │
│  └──────────────┘  └──────────────────────┘    │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────┐    │
│  │  Redis Cache │  │  Application Insights │    │
│  │  (state)     │  │  (monitoring)         │    │
│  └──────────────┘  └──────────────────────┘    │
└────────────────────────────────────────────────┘
```

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Key Vault](./key-vault.md) | OAuth client secret storage |
| [Redis Cache](./redis-cache.md) | Rate limiting and OAuth state |
| [Application Insights](./application-insights.md) | Monitoring and distributed tracing |
| [Managed Identity](./managed-identity.md) | Passwordless Azure authentication |

## How They Work Together

1. **Managed Identity** authenticates the Functions app to Azure (no passwords)
2. **Key Vault** stores OAuth client secrets, accessed via Managed Identity
3. **Redis** handles per-device rate limiting and CSRF state tokens
4. **Application Insights** collects telemetry from all operations

## Key Takeaways

- Each service does **one thing well** — the stack is minimal and purposeful
- **Managed Identity** eliminates the need for stored credentials
- **Redis** serves as the single source for runtime state
- **Application Insights** provides visibility into OAuth operations

## DJ.ai Connection

All four services are configured in `oauth-proxy/Program.cs` and provisioned via Bicep templates in `infra/`. For local development, Redis runs as a container via Aspire, Key Vault is replaced by `dotnet user-secrets`, and Application Insights is optional (OpenTelemetry exports to the Aspire dashboard). In production, all four services run in Azure, connected via Managed Identity.
