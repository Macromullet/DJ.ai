# DJ.ai Architecture

Complete architectural overview of the DJ.ai system.

## System Overview

DJ.ai is an AI-powered music application that provides DJ-style commentary and recommendations across multiple music streaming platforms. Local development is orchestrated by **.NET Aspire**; production runs on **Azure** (Bicep IaC, deployed via `scripts\deploy-infrastructure.ps1` using `az` CLI).

```
┌─────────────────────────────────────────────────────────────┐
│                     User (Electron App)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   UI/UX     │  │  AI Services │  │  Music Providers │   │
│  │  (React)    │  │  Commentary  │  │  · Spotify       │   │
│  │             │  │     TTS      │  │  · Apple Music   │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
  ┌──────────────┐  ┌─────────┐  ┌──────────────┐
  │ OAuth Proxy  │  │GitHub   │  │Music Provider│
  │ (Azure Func) │  │Copilot  │  │    APIs      │
  │              │  │  API    │  │              │
  │ ┌──────────┐ │  └─────────┘  │- Spotify     │
  │ │Key Vault │ │               │- Apple Music │
  │ └──────────┘ │               └──────────────┘
  │ ┌──────────┐ │
  │ │  Redis   │ │
  │ │(State)   │ │
  │ └──────────┘ │
  └──────────────┘
```

## Orchestration

### .NET Aspire (Local Development)

The `DJai.AppHost` project orchestrates all services locally:

```csharp
// DJai.AppHost/AppHost.cs
var redis = builder.AddRedis("cache");
var oauthProxy = builder.AddProject<Projects.DJai_OAuthProxy>("oauth-proxy")
    .WithReference(redis);
builder.AddNpmApp("electron-app", "../electron-app", "dev")
    .WithReference(oauthProxy)
    .WithEnvironment("VITE_OAUTH_PROXY_URL", oauthProxy.GetEndpoint("http"));
```

**Start:** `dotnet run --project DJai.AppHost`

**Aspire Dashboard** (`https://localhost:15888`) provides:
- Real-time structured logs from all services
- Distributed traces across OAuth flows
- Service health and metrics

### GitHub Actions CI/CD

Three pipelines in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push/PR to `main` | Build & type-check backend + frontend, Electron packaging on all 3 OS |
| `deploy-oauth-proxy.yml` | Push to `main` (oauth-proxy/infra paths) | Deploy to staging → production (with approval) via `az` CLI |
| `release-electron.yml` | `v*` tag push | Build Electron for Windows/macOS/Linux, create draft GitHub Release |

### Bicep Infrastructure (`infra/`)

All Azure resources defined as code. Bicep is the single source of truth — no JSON parameter files (gitignored).

```
infra/
├── main.bicep                  # Root template (hardened deployment)
└── modules/
    ├── vnet.bicep              # VNet with two subnets
    ├── private-dns-zones.bicep # DNS zones for private endpoints
    ├── private-endpoint.bicep  # Reusable PE module
    ├── function-app.bicep      # Azure Functions (OAuth Proxy)
    ├── key-vault.bicep         # Secret storage (RBAC, purge protection)
    ├── key-vault-access.bicep  # MI role assignment
    ├── redis.bicep             # Azure Cache for Redis (C1 Standard)
    ├── storage.bicep           # Functions storage (no shared keys)
    ├── storage-access.bicep    # MI role assignments (3 roles)
    ├── app-insights.bicep      # Telemetry (local auth disabled)
    └── log-analytics.bicep     # Log aggregation
```

Deployed with `.\scripts\deploy-infrastructure.ps1` or the GitHub Actions deploy pipeline.

## Architecture Decisions

### OAuth-Only Middle Tier

**Decision:** Use middle tier ONLY for OAuth token exchange, not for proxying all API calls.

**Rationale:**
- ✅ **Security:** Client secrets protected in Azure Key Vault
- ✅ **Performance:** Direct API calls are faster (no extra hop)
- ✅ **Cost:** Minimal Function invocations (~10/day vs 1000s/day)
- ✅ **Simplicity:** Standard OAuth 2.0 pattern

**What the middle tier does:**
- ✅ OAuth initiation (build auth URL with client secret)
- ✅ Token exchange (authorization code → access/refresh tokens)
- ✅ Token refresh (refresh token → new access token)

**What the middle tier does NOT do:**
- ❌ Proxy search, playback, or recommendation requests

### Redis for Distributed State

OAuth state parameters, device registry, and rate-limiting counters are stored in **Redis** instead of in-memory dictionaries:

- **Development:** Redis runs as a Docker container via Aspire
- **Production:** Azure Cache for Redis (provisioned by Bicep)

This enables horizontal scaling of the Function App without state loss.

### Provider Architecture

Unified `IMusicProvider` interface for all music services:

```typescript
interface IMusicProvider {
  authenticate(): Promise<AuthenticationResult>
  handleOAuthCallback(callbackUrl: string): Promise<boolean>
  signOut(): Promise<void>
  searchTracks(query: string): Promise<SearchResult[]>
  playTrack(result: SearchResult): Promise<string>
  getRecommendations(track: SearchResult): Promise<TrackRecommendation[]>
  getUserTopTracks(): Promise<SearchResult[]>
  pause(): Promise<void>
  play(): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
}
```

**Providers:**
- ✅ **SpotifyProvider** — Wired up
- ✅ **AppleMusicProvider** — Wired up

## Electron Security

The Electron main process (`electron/main.cjs`) implements several security hardening measures:

- **Content Security Policy (CSP)** — Injected via `session.defaultSession.webRequest.onHeadersReceived`; restricts script sources and network origins
- **`setWindowOpenHandler`** — Prevents arbitrary window creation; external URLs opened via `shell.openExternal`
- **`safeStorage`** — OS-level encryption for sensitive data (tokens) via Electron's safeStorage API
- **`djai://` protocol** — Custom protocol handler for OAuth callbacks in packaged builds (avoids localhost dependency)

## Component Architecture

### Electron App (Frontend)

```
electron-app/
├── electron/
│   ├── main.cjs              # Electron main process
│   └── preload.cjs           # Preload script (IPC bridge)
├── src/
│   ├── components/           # React components
│   ├── providers/            # IMusicProvider implementations
│   │   ├── SpotifyProvider.ts
│   │   ├── AppleMusicProvider.ts
│   │   └── MockMusicProvider.ts
│   ├── services/             # AI commentary, TTS
│   ├── types/                # TypeScript interfaces
│   └── config/               # OAuth configuration
```

### OAuth Proxy (Backend)

```
oauth-proxy/
├── Functions/                # HTTP trigger endpoints
├── Services/                 # ISecretService, IDeviceAuthService
├── Models/                   # DTOs
└── Program.cs                # DI configuration
```

**Endpoints:**
- `POST /api/oauth/{provider}/initiate` — Start OAuth flow
- `POST /api/oauth/{provider}/exchange` — Exchange code for tokens
- `POST /api/oauth/{provider}/refresh` — Refresh expired token

## Data Flow

### OAuth Flow

```
User            Electron App           OAuth Proxy         Key Vault       Provider
  │                  │                       │                 │              │
  │ Click "Connect"  │                       │                 │              │
  ├──────────────────>│                       │                 │              │
  │                  │ POST /oauth/initiate  │                 │              │
  │                  ├───────────────────────>│                 │              │
  │                  │                       │ Get Secret      │              │
  │                  │                       ├─────────────────>│              │
  │                  │ {authUrl, state}      │                 │              │
  │                  │<───────────────────────┤                 │              │
  │                  │                       │                 │              │
  │ Login & authorize│                       │                 │              │
  ├──────────────────────────────────────────────────────────────────────────>│
  │                  │                       │                 │              │
  │ Redirect (code)  │                       │                 │              │
  ├──────────────────>│                       │                 │              │
  │                  │ POST /oauth/exchange  │                 │              │
  │                  ├───────────────────────>│ Exchange code   │              │
  │                  │                       ├─────────────────────────────────>│
  │                  │ {accessToken,         │                 │              │
  │                  │  refreshToken}        │                 │              │
  │                  │<───────────────────────┤                 │              │
  │                  │                       │                 │              │
  │                  │ Direct API calls      │                 │              │
  │                  ├──────────────────────────────────────────────────────>│
```

### Music Search (Direct — No Proxy)

```
Electron App        Music Provider API
     │                       │
     │ GET /search           │
     │ (with access token)   │
     ├───────────────────────>│
     │ {results}             │
     │<───────────────────────┤
```

## Security Model

- **Client secrets** — Stored in Azure Key Vault, never exposed to client
- **Managed Identity** — Function App authenticates to all backing services without credentials
- **Zero public access** — All data-plane traffic flows through private endpoints over VNet
- **No shared keys (Storage & Key Vault)** — Storage and Key Vault use MI/AAD auth exclusively; Redis currently uses access-key auth (TODO: migrate to MI/AAD when supported by the Aspire integration)
- **Device tokens** — GUID per client for rate limiting (not cryptographic auth)
- **Rate limiting** — 1000 req/day, 100 req/hour per device (Redis-backed)
- **State validation** — CSRF protection on OAuth flows (Redis-backed)

## Azure Infrastructure Security Architecture

The production Azure environment enforces a **zero-trust, zero-public-access** posture. All data-plane communication between resources flows through private endpoints on a dedicated VNet.

### VNet Topology

```
VNet (10.0.0.0/16)
│
├── snet-functions (10.0.1.0/24)
│   ├── Delegation: Microsoft.Web/serverFarms
│   └── Function App (VNet-integrated)
│       ├── HTTP/2 enabled
│       ├── Remote debugging disabled
│       ├── Flex Consumption deployment (blob container with MI auth)
│       └── System-assigned Managed Identity
│
└── snet-private-endpoints (10.0.2.0/24)
    ├── PE → Storage Account (blob)    ──→ privatelink.blob.core.windows.net
    ├── PE → Storage Account (queue)   ──→ privatelink.queue.core.windows.net
    ├── PE → Storage Account (table)   ──→ privatelink.table.core.windows.net
    ├── PE → Key Vault                 ──→ privatelink.vaultcore.azure.net
    └── PE → Redis Cache               ──→ privatelink.redis.cache.windows.net
```

### Managed Identity Role Assignments

All inter-resource auth uses the Function App's system-assigned Managed Identity. Role assignments are declared in Bicep (no portal clicks):

| Target | Bicep Module | Roles |
|--------|-------------|-------|
| Storage Account | `storage-access.bicep` | Storage Blob Data Owner, Storage Account Contributor, Storage Queue Data Contributor, Storage Table Data Contributor |
| Key Vault | `key-vault-access.bicep` | Key Vault Secrets User |

### Resource Hardening Summary

| Resource | Public Network Access | Auth Model | Additional |
|----------|-----------------------|------------|------------|
| **Storage Account** | Disabled | MI only (`allowSharedKeyAccess: false`) | `allowBlobPublicAccess: false` |
| **Key Vault** | Disabled | Azure RBAC (no access policies) | Purge protection enabled |
| **Redis** | Disabled | Access-key auth via private endpoint | C1 Standard (required for PE support) |
| **App Insights** | — | `disableLocalAuth: true` | Workspace-based (Log Analytics) |
| **Function App** | Public (HTTPS only) | MI for backend services | VNet-integrated, HTTP/2 |

> **Note:** The Function App's public endpoint is intentionally accessible — it serves OAuth HTTP APIs to the Electron client app. All *backend* connections (Storage, Key Vault, Redis) are private.

## Deployment Architecture

### Development (Aspire)

```
Developer Machine (dotnet run --project DJai.AppHost)
├── OAuth Proxy (localhost:7071)
├── Redis (Docker container)
├── Electron App (localhost:5173)
└── Aspire Dashboard (localhost:15888)
```

### Production (Azure)

```
Azure (provisioned by infra/main.bicep → scripts\deploy-infrastructure.ps1)
│
├── VNet (10.0.0.0/16)
│   ├── snet-functions (10.0.1.0/24)
│   │   └── Function App (OAuth Proxy)
│   │       ├── Managed Identity → Key Vault (via PE)
│   │       ├── Managed Identity → Storage (via PE)
│   │       └── Managed Identity → Redis (via PE)
│   └── snet-private-endpoints (10.0.2.0/24)
│       ├── PE: Storage (blob, queue, table)
│       ├── PE: Key Vault
│       └── PE: Redis
│
├── Private DNS Zones (blob, queue, table, vault, redis)
├── Key Vault (OAuth client secrets — publicNetworkAccess: Disabled)
├── Azure Cache for Redis C1 Standard (state — publicNetworkAccess: Disabled)
├── Storage Account (Functions runtime — publicNetworkAccess: Disabled)
├── Application Insights + Log Analytics (disableLocalAuth: true)
└── Role Assignments (Bicep-managed: Blob Data Owner, Account Contributor, Queue Data Contributor, Table Data Contributor)

User Machine
└── Electron App (distributed via GitHub Releases)
```

## References

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [.NET Aspire](https://learn.microsoft.com/dotnet/aspire/)
- [Azure Functions .NET Isolated](https://learn.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
