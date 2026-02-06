# DJ.ai OAuth Proxy

OAuth-only middle tier for DJ.ai. Handles token initiation, exchange, and refresh for all music providers — keeping client secrets in Azure Key Vault while the Electron app makes all music API calls directly.

> **Not a full API proxy.** This service handles OAuth operations only. Music search, playback, and recommendations go directly from the Electron app to the provider APIs using OAuth tokens obtained here.

## Features

- ✅ YouTube Music, Spotify, and Apple Music OAuth (all fully implemented)
- ✅ Apple Music ES256 JWT signing (developer tokens)
- ✅ Azure Key Vault for client secrets (Managed Identity in production)
- ✅ Redis distributed state: state tokens, device registry, rate limiting
- ✅ Device token authentication (`X-Device-Token` header, GUID-based)
- ✅ Rate limiting: 1000/day, 100/hour per device (atomic Lua scripts)
- ✅ Health check endpoint
- ✅ .NET Aspire integration via ServiceDefaults

## Project Structure

```
oauth-proxy/
├── Functions/
│   ├── YouTubeOAuthFunctions.cs    # /initiate, /exchange, /refresh
│   ├── SpotifyOAuthFunctions.cs    # /initiate, /exchange, /refresh
│   ├── AppleMusicOAuthFunctions.cs # /initiate, /developer-token, /validate
│   └── HealthCheckFunction.cs      # /health
├── Services/
│   ├── ISecretService.cs           # Key Vault abstraction (ConcurrentDictionary cache with TTL)
│   ├── StubSecretService.cs        # Stub mode for dev without credentials
│   ├── IDeviceAuthService.cs       # Device auth interface
│   ├── RedisDeviceAuthService.cs   # Redis ZSET device tracking + rate limiting
│   ├── IStateStoreService.cs       # State store interface
│   ├── RedisStateStoreService.cs   # Redis state tokens (atomic consume)
│   └── ValidationService.cs        # URI allowlist, input validation
├── Middleware/                      # Request pipeline
├── Models/
│   └── OAuthModels.cs              # Request/response DTOs
├── Program.cs                      # DI (IHttpClientFactory, Redis, Key Vault)
├── host.json                       # Function App config
├── DJai.OAuthProxy.csproj          # .NET 8 isolated, ServiceDefaults ref
└── local.settings.json.example     # Template (copy for standalone use)
```

## API Endpoints

### YouTube Music

**POST** `/api/oauth/youtube/initiate`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "redirectUri": "http://localhost:5173/oauth/callback" }`
- Returns: `{ "authUrl": "https://...", "state": "..." }`

**POST** `/api/oauth/youtube/exchange`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "code": "...", "state": "..." }`
- Returns: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }`

**POST** `/api/oauth/youtube/refresh`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "refreshToken": "..." }`
- Returns: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }`

### Spotify

**POST** `/api/oauth/spotify/initiate`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "redirectUri": "http://localhost:5173/oauth/callback" }`
- Returns: `{ "authUrl": "https://...", "state": "..." }`

**POST** `/api/oauth/spotify/exchange`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "code": "...", "state": "..." }`
- Returns: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }`

**POST** `/api/oauth/spotify/refresh`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "refreshToken": "..." }`
- Returns: `{ "accessToken": "...", "refreshToken": "...", "expiresIn": 3600 }`

### Apple Music

**POST** `/api/oauth/apple/initiate`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "redirectUri": "http://localhost:5173/oauth/callback" }`
- Returns: `{ "authUrl": "https://...", "state": "..." }`

**POST** `/api/oauth/apple/developer-token`
- Headers: `X-Device-Token: <guid>`
- Returns: `{ "developerToken": "...", "expiresIn": 15552000 }`
- Signs an ES256 JWT using the Apple private key from Key Vault

**POST** `/api/oauth/apple/validate`
- Headers: `X-Device-Token: <guid>`
- Body: `{ "musicUserToken": "..." }`
- Returns: `{ "valid": true }`

### Health

**GET** `/api/health`
- Returns: `{ "status": "healthy", "timestamp": "..." }`

## Local Development

### Prerequisites

- .NET 8 SDK
- Azure Functions Core Tools v4
- Redis (optional for standalone; provided automatically by Aspire)

### Option 1: Aspire (Recommended) 🚀

Aspire orchestrates the full stack including Redis:

```powershell
dotnet run --project ..\DJai.AppHost
```

Secrets are loaded from `dotnet user-secrets` (set via `setup.ps1 --local`).

### Option 2: Stub Mode (No Credentials Needed) ⚡

All endpoints return valid-shaped fake responses — useful for frontend development without OAuth credentials:

```powershell
$env:USE_STUB_SECRETS="true"
func start --port 7071
```

### Option 3: Standalone with Real Credentials 🔐

```powershell
# One-time: store secrets via user-secrets
..\setup.ps1 --local

# Or copy the example file and fill in credentials manually
copy local.settings.json.example local.settings.json
# ⚠️ DO NOT commit local.settings.json — it's gitignored

func start --port 7071
```

### Testing with curl

```bash
# Initiate OAuth flow
curl -X POST http://localhost:7071/api/oauth/youtube/initiate \
  -H "X-Device-Token: 12345678-1234-1234-1234-123456789abc" \
  -H "Content-Type: application/json" \
  -d '{"redirectUri": "http://localhost:5173/oauth/callback"}'

# Exchange code for tokens
curl -X POST http://localhost:7071/api/oauth/youtube/exchange \
  -H "X-Device-Token: 12345678-1234-1234-1234-123456789abc" \
  -H "Content-Type: application/json" \
  -d '{"code": "4/...", "state": "..."}'

# Health check
curl http://localhost:7071/api/health
```

## Azure Deployment

Infrastructure is defined as Bicep IaC and deployed via Azure Developer CLI:

```powershell
# Deploy all infrastructure and application
azd up

# Push secrets to Key Vault after provisioning
..\setup.ps1 --cloud
```

CI/CD is handled by GitHub Actions (`.github/workflows/deploy-oauth-proxy.yml`). See [`../infra/`](../infra/) for Bicep templates.

**Deployed resources:**
- Azure Functions (Premium plan)
- Azure Cache for Redis
- Azure Key Vault
- Application Insights

## Security

- **Device tokens:** GUID per device, tracked in Redis ZSETs
- **Rate limiting:** 1000/day, 100/hour per device — enforced via atomic Lua scripts in Redis
- **State validation:** One-time-use state tokens consumed atomically (`StringGetDeleteAsync`) to prevent CSRF
- **URI allowlist:** Redirect URIs validated against configured allowed hosts
- **Key Vault:** Client secrets never in code; accessed via Managed Identity + RBAC
- **IHttpClientFactory:** Prevents socket exhaustion on outbound OAuth calls

## Environment Variables

### Local Development (`local.settings.json`)
- `GoogleClientId` / `GoogleClientSecret`
- `SpotifyClientId` / `SpotifyClientSecret`
- `AppleTeamId` / `AppleKeyId` / `ApplePrivateKey`
- `Redis__ConnectionString`
- `USE_STUB_SECRETS=true` — bypass Key Vault entirely

### Production (Azure)
- `KeyVaultUrl` — Key Vault URI; all secrets fetched via Managed Identity
- `Redis__ConnectionString` — Azure Cache for Redis connection string

## Cost Estimate

| Resource | Tier | Estimated Cost |
|---|---|---|
| Azure Functions | Premium EP1 | ~$15/mo |
| Azure Cache for Redis | Basic C0 | ~$15/mo |
| Azure Key Vault | Standard | <$1/mo |
| Application Insights | Pay-as-you-go | ~$0-2/mo |
| **Total** | | **~$30-35/mo** |

## References

- [Azure Functions .NET Isolated](https://learn.microsoft.com/en-us/azure/azure-functions/dotnet-isolated-process-guide)
- [Azure Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Apple Music JWT signing](https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens)
- [Azure Developer CLI (azd)](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/)
