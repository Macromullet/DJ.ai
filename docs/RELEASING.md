# Releasing DJ.ai

## Backend (OAuth Proxy)

Push to `main` triggers automatic deployment:

1. **CI runs** — build + type-check (`.github/workflows/ci.yml`)
2. **Deploy to staging** — automatic (`deploy-oauth-proxy.yml`)
3. **Deploy to production** — requires approval in the GitHub `production` environment

You can also trigger a manual deploy via `workflow_dispatch` on the deploy pipeline.

## Electron App

Tag-based releases:

1. Update version in `electron-app/package.json`
2. Commit: `chore: bump version to X.Y.Z`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push origin vX.Y.Z`
5. GitHub Actions builds for Windows, macOS, Linux (`.github/workflows/release-electron.yml`)
6. A **draft release** is created on GitHub — review and publish

### Build Artifacts

| Platform | Formats |
|----------|---------|
| Windows | `.exe` |
| macOS | `.dmg` |
| Linux | `.AppImage`, `.snap`, `.deb` |

## Code Signing

### Windows
Set these GitHub **secrets**:
- `CSC_LINK` — Base64-encoded code signing certificate (`.pfx`)
- `CSC_KEY_PASSWORD` — Certificate password

### macOS
Set these GitHub **secrets**:
- `APPLE_ID` — Apple ID email
- `APPLE_APP_PASSWORD` — App-specific password (generate at appleid.apple.com)
- `APPLE_TEAM_ID` — Apple Developer Team ID

Code signing is optional — unsigned builds will still be created but may show security warnings on end-user machines.

## Azure Deployment Secrets

Required GitHub **secrets** for the deploy pipeline:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Service principal client ID (federated credentials) |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

Required GitHub **variables**:

| Variable | Description |
|----------|-------------|
| `AZURE_LOCATION` | Azure region (default: `eastus2`) |
| `PRODUCTION_OAUTH_PROXY_URL` | Production OAuth proxy URL (e.g., `https://func-djai-xxx.azurewebsites.net/api`) |

## Version Strategy

- **Backend:** Deployed continuously from `main` — no version tags needed
- **Electron App:** Semantic versioning (`vMAJOR.MINOR.PATCH`) via git tags
- **Infrastructure:** Changes deploy alongside the backend (same pipeline)
