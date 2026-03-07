# ADR: Why Azure Functions

## Status

Accepted

## Context

DJ.ai needs a backend component to handle **OAuth token operations** — exchanging authorization codes for tokens and refreshing expired tokens. The client secret must be stored server-side (never exposed to the client). The backend needs to:

- Handle 3 endpoints per music provider (initiate, exchange, refresh)
- Store secrets securely (Azure Key Vault)
- Rate-limit device requests
- Scale to zero when unused (side project — minimize cost)

## Decision

Use **.NET 8 isolated Azure Functions** for the OAuth proxy backend.

## Alternatives Considered

### Express.js (Node.js)

| Pros | Cons |
|------|------|
| Same language as frontend | Requires a server running 24/7 (or containerized) |
| Huge npm ecosystem | Node.js Azure SDK less mature than .NET |
| Easy to prototype | Need to manage process lifecycle |

**Why not:** Always-on servers cost money even when idle. The OAuth proxy handles ~3 requests per user session — paying for 24/7 compute is wasteful.

### ASP.NET Core (Web API)

| Pros | Cons |
|------|------|
| Full framework features | Requires App Service (always-on) |
| Mature ecosystem | Overkill for 9 endpoints |
| Built-in middleware | Higher cost at low scale |

**Why not:** ASP.NET Core is designed for applications with many endpoints and complex middleware. Three simple endpoints per provider don't justify a full web framework.

### AWS Lambda

| Pros | Cons |
|------|------|
| Serverless, pay-per-use | AWS ecosystem (team uses Azure) |
| Mature, battle-tested | Different tooling from rest of stack |
| Good cold start times | No native Key Vault integration |

**Why not:** DJ.ai's infrastructure is Azure-native (Key Vault, Redis, Application Insights). Using AWS Lambda would split the cloud footprint.

## Consequences

**Positive:**
- **Scale to zero** — No cost when nobody is using the app
- **Pay-per-use** — Only charged for actual OAuth operations
- **Managed infrastructure** — No servers to patch or monitor
- **Azure integration** — Native Key Vault, Redis, App Insights support
- **Aspire support** — .NET Aspire orchestrates Functions locally

**Negative:**
- **Cold starts** — First request after idle takes ~1-2 seconds
- **Deployment complexity** — Azure Functions tooling has quirks
- **Limited runtime control** — Can't tune server-level settings

## DJ.ai Connection

The Azure Functions backend is in `oauth-proxy/`, with Function classes in `oauth-proxy/Functions/`. Each provider gets its own Functions class (e.g., `SpotifyOAuthFunctions.cs`). The `DJai.AppHost` Aspire project uses `AddAzureFunctionsProject()` to orchestrate the Functions locally during development. Deployment is via `azd deploy` or the GitHub Actions `deploy-oauth-proxy.yml` workflow.

## Further Reading

- [Azure Functions Overview](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview)
- [Azure Functions Pricing](https://azure.microsoft.com/en-us/pricing/details/functions/)
- [.NET Isolated Worker Process](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
