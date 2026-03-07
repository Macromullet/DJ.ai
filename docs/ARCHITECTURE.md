# DJ.ai Architecture

Complete architectural overview of the DJ.ai system.

## System Overview

DJ.ai is an AI-powered music application that provides DJ-style commentary and recommendations across multiple music streaming platforms. Local development is orchestrated by **.NET Aspire**; production runs on **Azure** (Bicep IaC, deployed via `azd`).

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
| `deploy-oauth-proxy.yml` | Push to `main` (oauth-proxy/infra paths) | Deploy to staging → production (with approval) via `azd` |
| `release-electron.yml` | `v*` tag push | Build Electron for Windows/macOS/Linux, create draft GitHub Release |

### Bicep Infrastructure (`infra/`)

All Azure resources defined as code:

```
infra/
├── main.bicep              # Root template
├── main.parameters.json    # Parameter defaults
└── modules/
    ├── function-app.bicep  # Azure Functions (OAuth Proxy)
    ├── key-vault.bicep     # Secret storage
    ├── redis.bicep         # Azure Cache for Redis
    ├── storage.bicep       # Functions storage
    ├── app-insights.bicep  # Telemetry
    ├── log-analytics.bicep # Log aggregation
    └── key-vault-access.bicep # RBAC
```

Deployed with `azd up` or the GitHub Actions deploy pipeline.

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
- **Managed Identity** — Function App authenticates to Key Vault without credentials
- **Device tokens** — GUID per client for rate limiting (not cryptographic auth)
- **Rate limiting** — 1000 req/day, 100 req/hour per device (Redis-backed)
- **State validation** — CSRF protection on OAuth flows (Redis-backed)

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
Azure (provisioned by infra/main.bicep)
├── Function App (OAuth Proxy)
│   ├── Managed Identity → Key Vault
│   └── Connection → Azure Cache for Redis
├── Key Vault (OAuth client secrets)
├── Azure Cache for Redis (state)
├── Application Insights + Log Analytics
└── Storage Account

User Machine
└── Electron App (distributed via GitHub Releases)
```

## References

- [OAuth 2.0 Specification](https://oauth.net/2/)
- [.NET Aspire](https://learn.microsoft.com/dotnet/aspire/)
- [Azure Functions .NET Isolated](https://learn.microsoft.com/azure/azure-functions/dotnet-isolated-process-guide)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi)
