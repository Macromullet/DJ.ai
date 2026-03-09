# Deploying DJ.ai to Azure

Infrastructure is defined as **Bicep** in `infra/` and deployed via the **`scripts\deploy-infrastructure.ps1`** script (uses `az` CLI directly — no `azd` required). GitHub Actions CI/CD is also available.

> **Note:** All JSON parameter files have been removed from `infra/`. Bicep source is the single source of truth (`infra/**/*.json` is gitignored).

## Prerequisites

- Azure subscription
- [Azure CLI (`az`)](https://learn.microsoft.com/cli/azure/install-azure-cli)
- .NET 8 SDK
- [Azure Functions Core Tools v4](https://learn.microsoft.com/azure/azure-functions/functions-run-tools?tabs=v4) (`npm i -g azure-functions-core-tools@4`)

### Deployer Permissions

The identity running the deploy (your user account or a CI service principal) needs these roles on the target resource group:

| Role | Why |
|------|-----|
| **Contributor** | Create and update all Azure resources |
| **User Access Administrator** | Create Managed Identity role assignments (Storage, Key Vault) |

Without **User Access Administrator**, the `storageAccess` and `keyVaultAccess` Bicep modules will fail at deploy time.

## Resource Group Convention

Resource groups follow the pattern **`rg-djai-{environment}`**:

| Environment | Resource Group |
|-------------|----------------|
| dev | `rg-djai-dev` |
| staging | `rg-djai-staging` |
| prod | `rg-djai-prod` |

Resource groups must be **pre-created** before running the deploy script:

```bash
az group create --name rg-djai-dev --location eastus2
```

## Quick Deploy (Manual)

```powershell
# 1. Login
az login

# 2. Create resource group (first time only)
az group create --name rg-djai-dev --location eastus2

# 3. Deploy infrastructure + publish app
.\scripts\deploy-infrastructure.ps1 -Environment dev

# Or validate Bicep only (no deploy)
.\scripts\deploy-infrastructure.ps1 -ValidateOnly

# Or skip provisioning and just publish app code
.\scripts\deploy-infrastructure.ps1 -SkipProvision

# Deploy to staging/prod
.\scripts\deploy-infrastructure.ps1 -Environment staging
.\scripts\deploy-infrastructure.ps1 -Environment prod
```

The script validates all Bicep templates, runs `az deployment group create`, builds and publishes the Azure Functions app, and outputs the endpoint URL.

### What Gets Created

| Resource | Purpose | Security |
|----------|---------|----------|
| VNet (`10.0.0.0/16`) | Network isolation | Two subnets (functions + private endpoints) |
| Azure Functions | OAuth proxy endpoints | VNet-integrated, HTTP/2, MI-only auth |
| Azure Key Vault | OAuth client secrets | RBAC-enabled, purge protection, private endpoint |
| Azure Cache for Redis (C1 Standard) | OAuth state, device registry, rate limiting | Access-key auth, private endpoint |
| Application Insights | Telemetry and logging | Local auth disabled |
| Log Analytics Workspace | Log aggregation | — |
| Storage Account | Functions runtime storage | No shared keys, no public access, private endpoints |
| Private DNS Zones | Name resolution for private endpoints | Blob, queue, table, vault, Redis |
| Role Assignments | MI permissions (scripted in Bicep) | Blob Data Owner, Account Contributor, Queue Data Contributor, Table Data Contributor |

See `infra/README.md` and `infra/main.bicep` for full infrastructure details.

## Infrastructure Security

All Azure resources are hardened with **zero public data-plane access** and **Managed Identity** authentication:

### Network Isolation

```
VNet (10.0.0.0/16)
├── snet-functions (10.0.1.0/24)
│   └── Function App (VNet-integrated, delegated to Microsoft.Web/serverFarms)
└── snet-private-endpoints (10.0.2.0/24)
    ├── PE → Storage Account (blob)
    ├── PE → Storage Account (queue)
    ├── PE → Storage Account (table)
    ├── PE → Key Vault
    └── PE → Redis Cache
```

All data-plane traffic between the Function App and backing services flows through **private endpoints** over the VNet. Public network access is **disabled** on every data resource.

### Managed Identity (No Shared Keys)

The Function App uses a **system-assigned Managed Identity** for Storage and Key Vault auth. Redis currently uses access-key connection strings (TODO: migrate to MI/AAD auth when supported by the Aspire integration).

| Target Resource | Role Assignment(s) | Assigned To |
|-----------------|---------------------|-------------|
| Storage Account | Storage Blob Data Owner, Storage Account Contributor, Storage Queue Data Contributor, Storage Table Data Contributor | Function App MI |
| Key Vault | Key Vault Secrets User | Function App MI |
| Redis | (access-key connection string via PE) | — |

### Resource-Level Hardening

| Resource | Settings |
|----------|----------|
| **Storage** | `allowSharedKeyAccess: false`, `allowBlobPublicAccess: false`, `publicNetworkAccess: Disabled` |
| **Key Vault** | RBAC authorization, purge protection enabled, `publicNetworkAccess: Disabled` |
| **Redis** | C1 Standard (required for PE support), access-key auth, `publicNetworkAccess: Disabled` |
| **App Insights** | `disableLocalAuth: true` |
| **Function App** | VNet-integrated, HTTP/2, remote debugging disabled, Flex Consumption deployment via `functionAppConfig.deployment.storage` (blob container with MI auth) |

## GitHub Actions Pipelines

### OAuth Proxy Deployment (`deploy-oauth-proxy.yml`)

Triggers on push to `main` when `oauth-proxy/` or `infra/` files change.

**Pipeline:**
1. **Build & Test** — `dotnet build`, `dotnet publish`
2. **Deploy to Staging** — `az deployment group create` + `func azure functionapp publish` (automatic)
3. **Deploy to Production** — Same, but requires **manual approval** in the GitHub `production` environment

Can also be triggered manually via `workflow_dispatch`.

> **Note:** The pipeline uses `az` CLI directly (matching `scripts\deploy-infrastructure.ps1`), not `azd`.

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
az keyvault secret set --vault-name <your-kv> --name SpotifyClientId --value "<value>"
az keyvault secret set --vault-name <your-kv> --name SpotifyClientSecret --value "<value>"
# ... repeat for Apple Music secrets
```

### GitHub Secrets (for CI/CD)

GitHub Actions authenticates with Azure using **OIDC federation** — no long-lived
passwords or client secrets. Instead, GitHub requests a short-lived token from its
own identity provider, and Azure AD validates it against a federated credential
tied to your repository.

#### Step 1: Create an Azure AD App Registration

```bash
# Create the app registration
az ad app create --display-name "DJ.ai GitHub Deploy"
# Note the "appId" from the output — this becomes AZURE_CLIENT_ID

# Create a service principal for it
az ad sp create --id <appId>
```

#### Step 2: Add Federated Credentials for GitHub Environments

The deploy workflow uses GitHub **environments** (`staging` and `production`), so you
need a federated credential for each:

```bash
# Staging environment (auto-deploys on push to main)
az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-staging",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:environment:staging",
  "audiences": ["api://AzureADTokenExchange"],
  "description": "Deploy to staging environment"
}'

# Production environment (manual dispatch with approval gate)
az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-production",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:<owner>/<repo>:environment:production",
  "audiences": ["api://AzureADTokenExchange"],
  "description": "Deploy to production environment"
}'
```

> **Note:** Replace `<owner>/<repo>` in the `subject` fields above with your actual GitHub repository (e.g., `myorg/DJ.ai`).

#### Step 3: Create GitHub Environments

Go to repo → **Settings → Environments** and create two environments:

| Environment | Purpose | Configuration |
|-------------|---------|---------------|
| `staging` | Auto-deploy on push to `main` (only when `oauth-proxy/**` or `infra/**` paths change) | No approval required |
| `production` | Manual deploy via workflow dispatch | Add **required reviewer** for approval gate |

Both environments must exist before the deploy workflow can run — the federated
credentials from Step 2 are bound to these environment names.

#### Step 4: Grant Permissions

The service principal needs **Contributor** (to create resources), **User Access Administrator** (to create Managed Identity role assignments), and **Key Vault Secrets Officer** (to set secrets during deploy) on each target resource group:

```bash
# Look up the service principal's object ID (use this as --assignee, not the appId)
SP_OBJECT_ID=$(az ad sp show --id <appId> --query id -o tsv)

# Contributor role (create/update resources) — scoped to resource group
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role Contributor \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-djai-dev

# User Access Administrator (create MI role assignments — required for Bicep RBAC modules)
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "User Access Administrator" \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-djai-dev

# Key Vault Secrets Officer (set secrets during deploy)
az role assignment create \
  --assignee "$SP_OBJECT_ID" \
  --role "Key Vault Secrets Officer" \
  --scope /subscriptions/<subscription-id>/resourceGroups/rg-djai-dev
```

> **Repeat for each environment:** Replace `rg-djai-dev` with `rg-djai-staging` and
> `rg-djai-prod` to grant access to all environments.

#### Step 5: Set GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret | How to get the value |
|--------|----------------------|
| `AZURE_CLIENT_ID` | `appId` from Step 1 |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |

#### Step 6: Set GitHub Variables

Same page, switch to the **Variables** tab:

| Variable | Description |
|----------|-------------|
| `AZURE_LOCATION` | Azure region (default: `eastus2`) |
| `PRODUCTION_OAUTH_PROXY_URL` | Production OAuth proxy URL (for Electron builds) |
| `ALLOWED_REDIRECT_HOSTS` | Comma-separated list of allowed OAuth redirect hostnames (e.g., `localhost`) |

### Resource Group Separation

Each environment gets its own isolated resource group following the `rg-djai-{environment}` convention:

| Environment | Resource Group | Trigger | Resources |
|-------------|----------------|---------|-----------|
| Dev | `rg-djai-dev` | Manual (`deploy-infrastructure.ps1`) | Full stack (VNet, Function App, Key Vault, Redis, Storage, PEs) |
| Staging | `rg-djai-staging` | Push to `main` (oauth-proxy/infra changes) | Full stack |
| Production | `rg-djai-prod` | Manual workflow dispatch + approval | Full stack |

Each environment gets its own isolated set of resources — there is no sharing
between environments.

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

### Spotify
1. [Spotify Dashboard](https://developer.spotify.com/dashboard) → Create app
2. Add redirect URIs:
   - `http://localhost:5173/oauth/callback` (dev)
   - `djai://oauth/callback` (Electron packaged)
   - `https://your-domain/oauth/callback` (production web)

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
| Redis (Standard C1) | ~$43 |
| Storage Account | < $1 |
| App Insights | Free tier |
| VNet / Private Endpoints | < $10 |
| **Total** | **~$55–60** |

> **Note:** Redis was upgraded from Basic C0 (~$15/mo) to Standard C1 (~$43/mo) to
> support private endpoints (and future AAD authentication). This is required for the
> zero-public-access security model. Redis currently uses access-key auth (TODO: migrate to MI/AAD).

## Cleanup

```bash
# Delete all Azure resources for an environment
az group delete --name rg-djai-dev --no-wait --yes

# Or for other environments
az group delete --name rg-djai-staging --no-wait --yes
az group delete --name rg-djai-prod --no-wait --yes
```

> **Note:** Key Vault has purge protection enabled (7-day soft-delete retention). After deleting
> the resource group, the Key Vault enters a soft-deleted state. To fully reclaim the
> name, run: `az keyvault purge --name <kv-name>`

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
