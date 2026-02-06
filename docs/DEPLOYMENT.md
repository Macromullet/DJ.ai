# Deploying DJ.ai to Azure

Infrastructure is defined as **Bicep** in `infra/` and deployed via **Azure Developer CLI (`azd`)** or **GitHub Actions**.

## Prerequisites

- Azure subscription
- [Azure Developer CLI (`azd`)](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd)
- .NET 8 SDK

## Quick Deploy (Manual)

```bash
# 1. Login
azd auth login

# 2. Provision infrastructure + deploy code
azd up
```

That's it. `azd up` reads `azure.yaml`, provisions all Bicep resources (Function App, Key Vault, Redis, App Insights, Storage), and deploys the OAuth proxy.

### What Gets Created

| Resource | Purpose |
|----------|---------|
| Azure Functions | OAuth proxy endpoints |
| Azure Key Vault | OAuth client secrets |
| Azure Cache for Redis | OAuth state, device registry, rate limiting |
| Application Insights | Telemetry and logging |
| Log Analytics Workspace | Log aggregation |
| Storage Account | Functions runtime storage |

See `infra/README.md` and `infra/main.bicep` for full infrastructure details.

## GitHub Actions Pipelines

### OAuth Proxy Deployment (`deploy-oauth-proxy.yml`)

Triggers on push to `main` when `oauth-proxy/` or `infra/` files change.

**Pipeline:**
1. **Build & Test** — `dotnet build`, `dotnet publish`
2. **Deploy to Staging** — `azd provision` + `azd deploy` (automatic)
3. **Deploy to Production** — Same, but requires **manual approval** in the GitHub `production` environment

Can also be triggered manually via `workflow_dispatch`.

### Electron Release (`release-electron.yml`)

Tag-based releases — see [docs/RELEASING.md](RELEASING.md).

### CI (`ci.yml`)

Runs on every push/PR to `main`:
- Backend: `dotnet restore` → `dotnet build`
- Frontend: `npm ci` → `tsc --noEmit` → `npm run build`
- Electron packaging: dry-run on Windows, macOS, Linux

## Configure Secrets

Run the interactive cloud setup tool:

```powershell
# Windows
.\setup.ps1 --cloud

# macOS/Linux  
./setup.sh --cloud
```

This will:
- Verify your Azure CLI is authenticated
- Auto-detect your Key Vault name (or prompt for it)
- Prompt for each OAuth provider's credentials
- Push them to Key Vault via `az keyvault secret set`
- Configure `ALLOWED_REDIRECT_HOSTS` for your deployment

### Manual Alternative
```bash
az keyvault secret set --vault-name <your-kv> --name GoogleClientId --value "<value>"
az keyvault secret set --vault-name <your-kv> --name GoogleClientSecret --value "<value>"
# ... repeat for Spotify and Apple Music secrets
```

### GitHub Secrets (for CI/CD)

Required **secrets** (repo → Settings → Secrets):

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service principal client ID (federated credentials) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

Required **variables** (repo → Settings → Variables):

| Variable | Description |
|----------|-------------|
| `AZURE_LOCATION` | Azure region (default: `eastus2`) |
| `PRODUCTION_OAUTH_PROXY_URL` | Production OAuth proxy URL (for Electron builds) |

### Code Signing Secrets (Optional)

For signed Electron releases:

| Secret | Platform | Description |
|--------|----------|-------------|
| `CSC_LINK` | Windows | Base64-encoded code signing certificate |
| `CSC_KEY_PASSWORD` | Windows | Certificate password |
| `APPLE_ID` | macOS | Apple ID for notarization |
| `APPLE_APP_PASSWORD` | macOS | App-specific password |
| `APPLE_TEAM_ID` | macOS | Apple Developer Team ID |

## OAuth App Registration

### Google (YouTube Music)
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth 2.0 Client ID
2. Enable **YouTube Data API v3**
3. Add redirect URIs:
   - `http://localhost:5173/oauth/callback` (dev)
   - `djai://oauth/callback` (Electron packaged)
   - `https://your-domain/oauth/callback` (production web)

### Spotify
1. [Spotify Dashboard](https://developer.spotify.com/dashboard) → Create app
2. Add redirect URIs (same pattern as above)

### Apple Music
1. Requires [Apple Developer Account](https://developer.apple.com) ($99/year)
2. Create MusicKit identifier and generate developer token

## Monitoring

```bash
# Stream live logs
az functionapp log tail --name $(azd env get-values | grep AZURE_FUNCTION_APP_NAME | cut -d= -f2 | tr -d '"') --resource-group rg-$(azd env get-values | grep AZURE_ENV_NAME | cut -d= -f2 | tr -d '"')
```

Or use **Application Insights** in the Azure Portal for metrics, traces, and failures.

## Update Electron App for Production

Set the production OAuth proxy URL when building:
```bash
VITE_OAUTH_PROXY_URL=https://your-func.azurewebsites.net/api npm run build
```

This is handled automatically by the release pipeline via the `PRODUCTION_OAUTH_PROXY_URL` variable.

## Cost Estimate (Personal Use)

| Resource | Monthly Cost |
|----------|-------------|
| Azure Functions (Consumption) | $0–5 |
| Key Vault | < $1 |
| Redis (Basic C0) | ~$15 |
| Storage Account | < $1 |
| App Insights | Free tier |
| **Total** | **~$17–22** |

## Cleanup

```bash
azd down --purge  # Delete all Azure resources
```

## Troubleshooting

### "401 Unauthorized" from Function
- Check device token is valid GUID format
- Verify `X-Device-Token` header is sent

### "500 Internal Server Error"
- Check Function App logs (`az functionapp log tail`)
- Verify Key Vault secrets are set
- Check Managed Identity has Key Vault access

### "Token exchange failed"
- Authorization code expires in 60 seconds
- Redirect URI must match exactly
- Verify client secret in Key Vault is correct
