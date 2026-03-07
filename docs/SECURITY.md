# DJ.ai Security Architecture

This document catalogs every security measure in the DJ.ai codebase, organized by defense layer. It is the authoritative reference for understanding how the application protects user data, API credentials, and communication channels.

> **Last reviewed**: March 2026 — MOE review rounds R1–R8 (8 rounds, 3 models per round)

---

## Table of Contents

- [API Key Management](#api-key-management)
- [Content Security Policy](#content-security-policy)
- [Electron Process Isolation](#electron-process-isolation)
- [IPC Security](#ipc-security)
- [URL & Host Validation](#url--host-validation)
- [OAuth Security](#oauth-security)
- [Rate Limiting](#rate-limiting)
- [Network Security](#network-security)
- [Input Validation](#input-validation)
- [Secret Management (Azure)](#secret-management-azure)
- [CI/CD Security](#cicd-security)
- [Known Gaps & Roadmap](#known-gaps--roadmap)

---

## API Key Management

**Principle**: API keys never exist as plaintext in the renderer process. The Electron main process is the sole custodian.

### Architecture

```
User enters key in Settings
  → IPC: save-api-keys({ openaiApiKey: 'sk-...' })
  → Main process encrypts with safeStorage (OS keychain)
  → Writes encrypted blob to <userData>/api-keys.enc
  → Key stored in main-process memory map
  → React state receives 'configured' placeholder (never plaintext)
  → When service makes API call via IPC proxy:
      Main process injects real auth header based on URL host
      Renderer never sends auth headers
```

### Key Injection Map

| Host | Header | Source Key |
|------|--------|-----------|
| `api.openai.com` | `Authorization: Bearer {key}` | `openaiApiKey` |
| `api.anthropic.com` | `x-api-key: {key}` | `anthropicApiKey` |
| `api.elevenlabs.io` | `xi-api-key: {key}` | `elevenLabsApiKey` |
| `generativelanguage.googleapis.com` | `x-goog-api-key: {key}` | `geminiApiKey` |

### IPC Surface

| Handler | Direction | Data |
|---------|-----------|------|
| `save-api-keys` | Renderer → Main | Partial key map (only changed keys) |
| `get-api-key-status` | Renderer → Main | Returns `{ openaiApiKey: boolean, ... }` |
| `clear-api-keys` | Renderer → Main | Wipes all keys + deletes encrypted file |

**What's NOT exposed**: There is no `decrypt` or `get-api-keys` IPC. The renderer cannot retrieve plaintext keys after initial save.

### Files

- `electron-app/electron/main.cjs` — key store, `loadApiKeys()`, `persistApiKeys()`, `injectAuthHeaders()`
- `electron-app/electron/preload.cjs` — `apiKeys` context bridge (save/getStatus/clear only)
- `electron-app/src/utils/secretStorage.ts` — renderer-side abstraction
- `electron-app/src/App.tsx` — sanitizes keys from React state after save

---

## Content Security Policy

**Principle**: Restrict what code can execute and where the app can connect.

### Directives

| Directive | Production | Dev Mode |
|-----------|-----------|----------|
| `default-src` | `'self'` | `'self'` |
| `script-src` | `'self'` + music SDK hosts | `'self' 'unsafe-inline'` + music SDK hosts |
| `style-src` | `'self' 'unsafe-inline'` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: https: http:` | same |
| `media-src` | `'self' https:` | same |
| `connect-src` | `'self'` + localhost + Azure + AI + music APIs | same |

**Key decisions**:
- `unsafe-inline` removed from `script-src` in production (Vite bundles all JS into external files)
- `unsafe-inline` kept in `style-src` (React inline styles require it)
- `unsafe-eval` is **never** included
- CSP only applied to the main app window (not OAuth provider popups)

### Enforcement

CSP is injected via Electron's `webRequest.onHeadersReceived` hook on every response to the main window. The `buildCSP({ isDev })` function generates the policy based on the environment.

### Files

- `electron-app/electron/validation.cjs` — `buildCSP()` function
- `electron-app/electron/main.cjs` — CSP injection in `app.whenReady()`
- `electron-app/electron/__tests__/validation.test.ts` — CSP directive tests

---

## Electron Process Isolation

**Principle**: The renderer is an untrusted sandbox. All privileged operations go through the main process.

### Web Preferences (Hardened)

| Setting | Value | Effect |
|---------|-------|--------|
| `nodeIntegration` | `false` | No `require()`, `process`, `fs` in renderer |
| `contextIsolation` | `true` | Separate JS worlds for preload and renderer |
| `sandbox` | `true` (default) | OS-level process sandbox |

### Navigation Controls

- **External links**: `setWindowOpenHandler` intercepts all `window.open` / `target="_blank"`. Only `isAllowedExternalProtocol()` URLs are opened in the system browser. All in-window opening is denied.
- **OAuth windows**: Separate `BrowserWindow` with no preload script. Navigation intercepted by `will-redirect` and `will-navigate` hooks — only OAuth callbacks are forwarded to main window.
- **Dev tools**: Only opened in dev mode (`!app.isPackaged`). Disabled in production builds.

### Files

- `electron-app/electron/main.cjs` — window creation, navigation handlers

---

## IPC Security

**Principle**: Minimize the API surface exposed to the renderer. Validate all inputs.

### Context Bridge API

| API | Purpose | Validation |
|-----|---------|------------|
| `openOAuthWindow({ url, redirectUri })` | Open OAuth popup | `isAllowedOAuthHost(url)` + `isValidRedirectUri(redirectUri)` |
| `aiProxy.request({ url, ... })` | AI API proxy | `isAllowedAIHost(url)` — auth injected by main |
| `aiProxy.ttsRequest({ url, ... })` | TTS proxy | `isAllowedAIHost(url)` + 10MB response limit |
| `apiKeys.save(keys)` | Store API keys | Type check, known-key filter |
| `apiKeys.getStatus()` | Key status | Returns booleans only |
| `apiKeys.clear()` | Wipe keys | No params needed |
| `notifications.show(opts)` | Desktop notification | Electron `Notification` API |
| `tray.*` | System tray updates | Simple data forwarding |
| `oauthDeepLink.onCallback` | Deep link listener | Event subscription only |

### What's NOT Exposed

- No filesystem access (`fs`, `path`)
- No process spawning (`child_process`)
- No clipboard access
- No `webContents` manipulation
- No general-purpose decrypt/encrypt
- No `shell.openExternal` (controlled via main process only)

### Files

- `electron-app/electron/preload.cjs` — complete context bridge definition

---

## URL & Host Validation

**Principle**: All outbound requests are validated against allowlists. No wildcard domains.

### AI API Allowlist

```
api.openai.com
api.anthropic.com
generativelanguage.googleapis.com
api.elevenlabs.io
```

**`isAllowedAIHost(url)`** enforces:
- HTTPS protocol only
- No userinfo (username:password in URL)
- No non-standard ports
- Exact hostname match (no wildcards, no subdomains)

### OAuth Provider Allowlist

```
accounts.spotify.com
appleid.apple.com
authorize.music.apple.com
```

**`isAllowedOAuthHost(url)`** enforces the same HTTPS + exact hostname rules.

### Redirect URI Validation

**Frontend** (`isValidRedirectUri`):
- `djai://oauth/callback` (custom protocol)
- `http://localhost:{5173-5177}/oauth/callback` (dev servers)

**Backend** (`ValidationService.ValidateRedirectUri`):
- Max 2048 bytes
- URI must parse cleanly
- HTTPS required for non-localhost hosts
- Configurable via `ALLOWED_REDIRECT_HOSTS` and `ALLOWED_REDIRECT_SCHEMES` env vars

### External Protocol Allowlist

`isAllowedExternalProtocol()` permits `https:` and `http:` only. All other protocols are blocked from `shell.openExternal()`.

### Files

- `electron-app/electron/validation.cjs` — all frontend validation functions
- `oauth-proxy/Services/ValidationService.cs` — backend validation
- `electron-app/electron/__tests__/validation.test.ts` — 93+ validation tests

---

## OAuth Security

### Device Token Authentication

Each client generates a GUID stored in `localStorage` as `X-Device-Token`. This is **not** cryptographic authentication — it's abuse prevention for the free OAuth proxy.

| Property | Value |
|----------|-------|
| Format | Valid GUID (server-validated via `Guid.TryParse`) |
| TTL | 24 hours in Redis |
| Pool size | Max 10,000 active devices |
| LRU eviction | Oldest 10% when pool full |
| Rate-limit history | Preserved across eviction (prevents bypass) |

### State Parameter

OAuth `state` is stored in Redis with a 10-minute TTL. Consumption is **atomic** (get-and-delete) to prevent replay attacks. Format: 8–256 chars, alphanumeric + hyphen.

### Custom Protocol (djai://)

The app registers `djai://` as a custom protocol for OAuth callbacks in packaged builds:

1. App registers `djai` protocol via `app.setAsDefaultProtocolClient('djai')`
2. OAuth provider redirects to `djai://oauth/callback?code=...&state=...`
3. OS opens the app (or second-instance handler fires)
4. `isDjaiOAuthCallback(url)` validates the URL
5. URL forwarded to renderer via IPC

### Token Storage

OAuth tokens (access + refresh) are stored in `localStorage`. This is the standard pattern for desktop OAuth apps — the tokens are scoped to the device and the alternative (keychain) provides no additional security for a desktop Electron app.

### Files

- `oauth-proxy/Services/RedisDeviceAuthService.cs` — device auth + rate limiting
- `oauth-proxy/Services/RedisStateStoreService.cs` — state parameter management
- `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` — OAuth endpoint implementation
- `electron-app/electron/main.cjs` — custom protocol registration

---

## Rate Limiting

### Configuration

| Limit | Value | Scope |
|-------|-------|-------|
| Requests per hour | 100 | Per device token |
| Requests per day | 1,000 | Per device token |
| Max devices | 10,000 | Global pool |

### Implementation (Redis)

Rate limiting uses **Redis sorted sets** with a **Lua script** for atomic check-and-record:

1. Remove expired entries from daily/hourly sorted sets
2. Check daily count ≥ 1000 → **BLOCK**
3. Check hourly count ≥ 100 → **BLOCK**
4. Add timestamped request entry to both sets
5. Set TTL on sets (24h + 1min for daily, 1h + 1min for hourly)

### Fallback Mode (Redis Down)

When Redis is unavailable, the service falls back to in-memory `ConcurrentDictionary`:
- Same rate limits enforced
- LRU eviction preserves rate-limit history (prevents bypass via re-registration)
- Stale history entries (>24h, device no longer active) are periodically swept to bound memory growth

### Response

Rate-limited requests receive `429 Too Many Requests` with:
```json
{ "Error": "RateLimitExceeded", "Message": "Too many requests. Please try again later." }
```

### Files

- `oauth-proxy/Services/RedisDeviceAuthService.cs` — complete implementation
- `oauth-proxy.Tests/Services/RedisDeviceAuthServiceTests.cs` — rate limit + eviction tests

---

## Network Security

### CORS Bypass Pattern

The Electron renderer cannot make cross-origin requests to AI APIs. All requests are proxied through the main process via IPC (`ai-api-request`, `ai-tts-request`). The main process uses Node.js `fetch()` which is not subject to CORS.

### HTTPS Enforcement

| Context | Policy |
|---------|--------|
| AI API calls | HTTPS required (validated by `isAllowedAIHost`) |
| OAuth provider URLs | HTTPS required (validated by `isAllowedOAuthHost`) |
| Redirect URIs | HTTPS for production; HTTP only for localhost dev |
| Azure Functions | HTTPS by default (Azure platform) |
| Redis | TLS via Azure Cache for Redis |

### TTS Response Size Limit

TTS audio responses are capped at **10 MB** to prevent out-of-memory attacks:
- Checked via `Content-Length` header
- Checked again after `arrayBuffer()` download
- Returns `413 Payload Too Large` if exceeded

### Files

- `electron-app/electron/validation.cjs` — `TTS_MAX_SIZE`, `isTTSResponseWithinLimit()`
- `electron-app/electron/main.cjs` — AI/TTS proxy handlers with size checks

---

## Input Validation

### Backend (Azure Functions)

All OAuth endpoints validate:

| Field | Validation |
|-------|-----------|
| Device token | Valid GUID format (`Guid.TryParse`) |
| Redirect URI | Parsed URI, host allowlist, HTTPS for non-localhost |
| OAuth code | 10–1024 chars, alphanumeric + `-_./+=` |
| OAuth state | 8–256 chars, alphanumeric + `-` |
| Request body | JSON deserialization with required field checks |

State consumption is atomic (get-and-delete from Redis) — replay attacks are prevented.

### Frontend (API Key Validation)

- `validateOpenAIKey()` — calls `GET /v1/models` (minimal payload)
- `validateAnthropicKey()` — calls `POST /v1/messages` with 1-token message
- Both route through the IPC proxy and return boolean pass/fail

### Files

- `oauth-proxy/Services/ValidationService.cs` — backend validation service
- `electron-app/src/utils/validateApiKey.ts` — frontend key validation

---

## Secret Management (Azure)

### Architecture

| Environment | Secret Source | Authentication |
|-------------|-------------|----------------|
| **Production** | Azure Key Vault | Managed Identity |
| **Development** | dotnet user-secrets | Local file (never committed) |
| **Testing** | `StubSecretService` | Hardcoded test values |

### Key Vault Secrets

| Secret Name | Purpose |
|-------------|---------|
| `SpotifyClientId` | Spotify OAuth client ID |
| `SpotifyClientSecret` | Spotify OAuth client secret |
| `AppleMusicTeamId` | Apple Developer team ID |
| `AppleMusicKeyId` | Apple Music key identifier |
| `AppleMusicPrivateKey` | Apple Music auth private key (PEM) |

### Caching

Key Vault responses are cached in `IMemoryCache` with a **1-hour TTL** to minimize API calls while ensuring secret rotation takes effect within an hour.

### Health Check

The `/health` endpoint validates:
- Key Vault connectivity (can fetch Spotify client ID)
- Apple Music PEM key validity (basic format check)
- Returns `healthy`, `not_configured`, or `unhealthy` per check

### Setup Scripts

- `setup.ps1 --local` — interactive wizard for `dotnet user-secrets`
- `setup.ps1 --cloud` — interactive wizard for `az keyvault secret set`

### Files

- `oauth-proxy/Services/ISecretService.cs` — interface + 3 implementations
- `oauth-proxy/Functions/HealthCheckFunction.cs` — secret health validation
- `scripts/setup-local.ps1`, `scripts/setup-cloud.ps1` — setup wizards

---

## CI/CD Security

### Continuous Integration (`ci.yml`)

- Runs on every push: backend build + test, frontend typecheck + build, Electron package dry run
- No secrets consumed — pure build/test
- Pinned action versions

### OAuth Proxy Deployment (`deploy-oauth-proxy.yml`)

- **Trigger**: Manual (`workflow_dispatch`) only — no auto-deploy
- **Authentication**: OIDC federation (no long-lived credentials in GitHub)
- **Permissions**: `id-token: write` (OIDC), `contents: read`
- **Staging**: Deploys without approval
- **Production**: Requires GitHub environment approval gate
- **Token lifetime**: ~1 hour (auto-rotated per run)

### Electron Release (`release-electron.yml`)

- **Trigger**: Version tags only
- **Code signing**: Platform certificates via GitHub Secrets
  - Windows: `CSC_LINK` + `CSC_KEY_PASSWORD`
  - macOS: `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- **Output**: Draft GitHub Release with signed binaries

### OIDC Benefits

- ✅ No long-lived credentials stored in GitHub
- ✅ Tokens scoped to specific workflow runs
- ✅ Automatic rotation (no manual key management)
- ✅ No risk of leaked static credentials

### Files

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-oauth-proxy.yml`
- `.github/workflows/release-electron.yml`

---

## Known Gaps & Roadmap

| Gap | Severity | Status | Notes |
|-----|----------|--------|-------|
| PKCE not implemented | Medium | Planned | Would add code_verifier/code_challenge to OAuth flow |
| No `frame-src` in CSP | Low | Planned | Should add `frame-src 'none'` explicitly |
| Electron auto-update | Medium | Planned | Need staged rollouts with signature verification |
| Secret rotation policy | Low | Planned | Document Key Vault rotation schedule |

---

## Review History

This codebase has been reviewed through **8 rounds of Mixture-of-Experts (MOE) code review**, each using 3 independent AI models reviewing security, frontend, and backend concerns in parallel. Models are rotated between rounds to minimize blind spots.

| Round | Models | Findings | Status |
|-------|--------|----------|--------|
| R1–R5 | Gemini, Opus, Codex (various) | 20+ fixes | ✅ All resolved |
| R6 | Gemini 3 Pro, Opus 4.6, Codex 5.3 | 12 fixes | ✅ All resolved |
| R7 | Gemini 3 Pro, GPT-5.2 Codex, Opus 4.5 | 3 security findings | ✅ All resolved |
| R8 | Opus 4.5, Gemini 3 Pro, GPT-5.2 Codex | 4 findings | ✅ All resolved |
