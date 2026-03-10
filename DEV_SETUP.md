# Development Environment Setup

Quick guide to run DJ.ai locally. Uses **.NET Aspire** to orchestrate all services.

## Prerequisites

- ✅ **.NET 8 SDK** (with Aspire workload: `dotnet workload install aspire`)
- ✅ **Node.js 20+**
- ✅ **Docker Desktop** (for Redis container)
- ✅ **PowerShell** (Windows) or pwsh (cross-platform)

## Quick Start

### 1. Configure Secrets

Run the interactive setup tool to configure your OAuth provider credentials:

```powershell
# Windows
.\setup.ps1 --local

# macOS/Linux
./setup.sh --local
```

This will:
- Check that all prerequisites are installed (dotnet, Aspire, Node.js, Docker)
- Prompt you for each OAuth provider's credentials
- Store them securely via [dotnet user-secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) (encrypted, never in source control)

You'll need credentials for at least one provider:
- **Spotify**: [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) → Create App → Client ID & Secret
- **Apple Music**: [Apple Developer Portal](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Keys → MusicKit

> **Note**: You can skip providers you don't need.

### 2. Start Everything

From the root directory, either:

```powershell
# Option A: Aspire (recommended)
dotnet run --project DJai.AppHost

# Option B: Legacy script
.\start-dev.ps1
```

Aspire starts all services automatically:
- 🔐 **OAuth Proxy** — Azure Functions on `http://localhost:7071`
- 🗄️ **Redis** — Docker container for distributed state
- 🎵 **Electron App** — Vite dev server on `http://localhost:5173`
- 📊 **Aspire Dashboard** — `https://localhost:15888`

The Aspire Dashboard gives you real-time logs, traces, and metrics for every service.

### 3. Open the App

Navigate to `http://localhost:5173` or use the Aspire Dashboard to find service URLs.

## Manual Start (Fallback)

If you need to run services individually without Aspire:

**Terminal 1 — OAuth Proxy:**
```bash
cd oauth-proxy
func start --port 7071
```

**Terminal 2 — Electron App:**
```bash
cd electron-app
npm run dev
```

Ensure `electron-app/.env.local` has:
```
VITE_OAUTH_PROXY_URL=http://localhost:7071/api
```

## Verify Setup

### Test OAuth Proxy

```powershell
cd oauth-proxy
.\test-api.ps1
```

### Test Electron App

1. Open Settings (⚙️)
2. Select a music provider (Spotify or Apple Music)
3. Click "Connect" — you should see an OAuth login popup

If you get errors, check:
- OAuth proxy is running on port 7071
- `VITE_OAUTH_PROXY_URL` is `http://localhost:7071/api`
- Provider client ID/secret are configured

## Environment Variables

When using **Aspire** (recommended), environment variables are injected automatically from `dotnet user-secrets`.

For **standalone** use without Aspire, you can configure secrets manually:

### OAuth Proxy (`oauth-proxy/local.settings.json`)
```bash
# Copy the example file and fill in your credentials
cp oauth-proxy/local.settings.json.example oauth-proxy/local.settings.json
```
🔒 **NEVER commit this file!** (Already in .gitignore)

### Electron App (`electron-app/.env.local`)
```bash
VITE_OAUTH_PROXY_URL=http://localhost:7071/api
VITE_SPOTIFY_CLIENT_ID=your-spotify-client-id
```
🔒 **NEVER commit this file!** (Already in .gitignore)

> **Note:** When using Aspire, `VITE_OAUTH_PROXY_URL` is injected automatically — no `.env.local` needed.

## Troubleshooting

### "Port 7071 already in use"
```powershell
Get-NetTCPConnection -LocalPort 7071 -State Listen | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force
}
```

### "Port 5173 already in use"
Vite auto-increments to 5174, 5175, etc. Check startup output for the actual port.

### "Docker not running" (Aspire)
Start Docker Desktop — Redis runs as a container. Without Docker, use the manual start fallback (Redis features disabled).

### "401 Unauthorized from OAuth proxy"
- Device token is auto-generated on first use
- Check browser console (F12) for errors
- Verify `X-Device-Token` header is being sent

### Changes not reflecting
- **Backend:** Restart the Aspire host (Ctrl+C, re-run)
- **Frontend:** Vite HMR — just save the file
- **Environment:** Restart Aspire

## Production vs Development

| Feature | Development | Production |
|---------|-------------|------------|
| Orchestration | .NET Aspire | Azure (Bicep + az CLI) |
| OAuth Proxy | localhost:7071 | Azure Functions |
| State Store | Redis (Docker) | Azure Cache for Redis |
| Secrets | dotnet user-secrets (via setup.ps1) | Azure Key Vault |
| Auth | Environment variables | Managed Identity |

## Getting OAuth Credentials

### Spotify
1. Go to https://developer.spotify.com/dashboard
2. Create an app
3. Add redirect: `http://localhost:5173/oauth/callback`
4. Copy Client ID and Client Secret

### Apple Music
1. Requires Apple Developer account ($99/year)
2. See: https://developer.apple.com/documentation/applemusicapi

## Further Reading

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System architecture
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — Deploy to Azure
- **[docs/RELEASING.md](docs/RELEASING.md)** — Release process
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Contribution guidelines
