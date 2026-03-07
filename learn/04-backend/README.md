# 04 — Backend: .NET 8 + Azure Functions

## Overview

DJ.ai's backend is intentionally minimal: it handles **only OAuth token operations**. All music API calls go directly from the Electron app to music providers (YouTube, Spotify, Apple Music). The backend exists solely because OAuth requires **client secrets** that must never be exposed to client code.

The backend stack:
- **.NET 8** — runtime and SDK
- **Azure Functions (isolated worker)** — serverless HTTP endpoints
- **Azure Key Vault** — client secret storage
- **Azure Cache for Redis** — rate limiting and OAuth state
- **.NET Aspire** — local development orchestration

## Architecture

```
┌─────────────────┐     OAuth Only      ┌──────────────────┐
│  Electron App   │ ──────────────────► │  Azure Functions   │
│  (React)        │                     │  (oauth-proxy)     │
│                 │  ◄── tokens ─────── │                    │
│  Direct API ────┼──► YouTube API      │  ┌──────────────┐ │
│  calls using    │  ► Spotify API      │  │  Key Vault   │ │
│  OAuth tokens   │  ► Apple Music      │  │  (secrets)   │ │
│                 │                     │  └──────────────┘ │
└─────────────────┘                     │  ┌──────────────┐ │
                                        │  │    Redis     │ │
                                        │  │ (rate limit) │ │
                                        │  └──────────────┘ │
                                        └──────────────────┘
```

## Learning Path

| Order | Topic | Directory |
|-------|-------|-----------|
| 1 | .NET fundamentals | [dotnet/](./dotnet/) |
| 2 | Azure Functions | [azure-functions/](./azure-functions/) |
| 3 | Azure services | [azure-services/](./azure-services/) |
| 4 | .NET Aspire orchestration | [aspire/](./aspire/) |

## Key Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/oauth/{provider}/initiate` | POST | Generate OAuth authorization URL |
| `/api/oauth/{provider}/exchange` | POST | Exchange auth code for tokens |
| `/api/oauth/{provider}/refresh` | POST | Refresh expired access token |
| `/api/health` | GET | Health check (Key Vault connectivity) |

Supported providers: `youtube`, `spotify`, `apple`

## Key Takeaways

- The backend is an **OAuth-only middle tier** — it does not proxy API calls
- Client secrets are stored in **Key Vault**, never in code or config files
- **Rate limiting** (100/hour, 1000/day per device) prevents abuse
- **Redis** handles both rate limiting and OAuth state storage
- The backend is stateless — all state lives in Redis

## DJ.ai Connection

The backend source lives in `oauth-proxy/` with functions in `oauth-proxy/Functions/`, services in `oauth-proxy/Services/`, and models in `oauth-proxy/Models/`. The entry point `oauth-proxy/Program.cs` configures dependency injection, choosing between Key Vault (production), user-secrets (local dev), or stubs (testing) for secret storage. The Aspire host (`DJai.AppHost/`) orchestrates the backend alongside Redis and the Electron dev server for local development.
