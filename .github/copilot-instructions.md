# DJ.ai Copilot Instructions

## Project Overview

DJ.ai is an AI-powered music DJ application providing intelligent commentary and recommendations across multiple streaming platforms (YouTube Music, Spotify, Apple Music). Built as an Electron app with React frontend and .NET Azure Functions backend, orchestrated locally by .NET Aspire.

**Key Architecture:** OAuth-only middle tier pattern - the Azure Functions backend handles ONLY OAuth token exchange (not API proxying). All music API calls go directly from the Electron app to music providers using OAuth tokens.

## Workflow: Release-Flow

**Every body of work follows this flow:**

1. **Create a GitHub Issue** — describe the work (bug fix, feature, refactor). Use labels.
2. **Create a feature branch** from `main` (e.g., `feature/onboarding`, `fix/oauth-race`)
3. **Do work** on the branch — commit early and often with conventional commits
4. **Create a Pull Request** back to `main` — link it to the issue
5. **Code review** — associate reviews with the PR (agent reviews count — post findings as PR comments)
6. **Squash merge** to `main` with a descriptive commit message summarizing the work
7. **Delete the feature branch** after merge

**Branch naming:** `feature/<name>`, `fix/<name>`, `refactor/<name>`, `docs/<name>`

**PR titles** should match the squash commit message (conventional commits format).

## Agent Workflow Preferences

When working with Copilot agents on this project:

- **Always `git pull` before starting** any new work
- **Use Mixture-of-Experts (MOE)** for reviews: multiple models reviewing different concerns in parallel (backend, frontend, security). Rotate models between rounds.
- **Parallelize aggressively** — independent work items should run as parallel agents
- **Verify builds after every change** — run `npx tsc --noEmit` and `npx vite build` (frontend), `dotnet build` (backend)
- **Code review every feature branch** before merge — even when agents wrote the code, a review agent should check it
- **Fix review findings before merge** — don't skip issues; fix them and re-verify
- **Squash merge** feature branches to main (single clean commit per body of work)
- **Don't modify `package.json` or `package-lock.json`** without explicit permission — no surprise dependency changes

## Build, Test, and Development Commands

### Starting Development Environment

**With Aspire (recommended):**
```powershell
cd DJai.AppHost
dotnet run
```
Opens Aspire Dashboard at https://localhost:15888 — orchestrates oauth-proxy, Redis, and Electron dev server.

**With startup script:**
```powershell
.\start-dev.ps1
```

**Manual start (if needed):**
```bash
# Terminal 1 - OAuth proxy
cd oauth-proxy
func start --port 7071

# Terminal 2 - Electron app
cd electron-app
npm run dev
```

### Frontend (electron-app)

```bash
cd electron-app

# Development
npm run dev                    # Start Vite dev server on port 5173

# Building
npm run build                  # TypeScript compile + Vite build
npx tsc --noEmit               # Type-check only (fast verification)
npx vite build                 # Production bundle

# Electron
npm run electron:dev           # Run with Electron window
npm run electron:build         # Build distributable package
npm run electron:start         # Start Electron with built app

# Testing
npm test                       # Run Playwright tests (requires app running)
npm run test:ui               # Run Playwright with UI
npm run test:headed           # Run Playwright in headed mode
```

### Backend (oauth-proxy)

```bash
cd oauth-proxy

# Development
func start --port 7071        # Start Azure Functions locally

# Building (.NET)
dotnet build                  # Build project
dotnet restore                # Restore NuGet packages

# Secrets (local dev)
.\setup.ps1 --local           # Interactive setup for dotnet user-secrets
.\setup.ps1 --cloud           # Interactive setup for Azure Key Vault
```

### Aspire (DJai.AppHost)

```bash
cd DJai.AppHost
dotnet run                     # Start all services via Aspire
```

**Aspire gotchas:**
- Azure Functions need `AddAzureFunctionsProject()` (not `AddProject()`)
- `azure-functions-core-tools@4` must be installed globally
- Vite port: use `targetPort: 5173` (not `port: 5173`) to avoid DCP collision
- `AddViteApp` already registers an `http` endpoint — don't add `WithHttpEndpoint`

## High-Level Architecture

### OAuth-Only Middle Tier Pattern

**Critical concept:** The Azure Functions backend is NOT a full API proxy. It handles ONLY OAuth token operations:
- ✅ OAuth initiation (build auth URL)
- ✅ Token exchange (code → tokens)  
- ✅ Token refresh (refresh token → new access token)
- ❌ Does NOT proxy search/playback/API requests

**Why:** Client secrets must be protected (stored in Azure Key Vault), but music API calls are faster and cheaper when made directly from the client using OAuth tokens.

**OAuth Flow:**
```
1. User clicks "Connect" → App calls /oauth/{provider}/initiate
2. Backend fetches client secret from Key Vault
3. Backend returns auth URL → User logs in via popup
4. OAuth callback returns code → App calls /oauth/{provider}/exchange
5. Backend exchanges code for tokens (using client secret)
6. App stores tokens in localStorage
7. App makes ALL music API calls DIRECTLY to providers (not through backend)
8. Token expired? → Call /oauth/{provider}/refresh
```

### Three-Layer Architecture

**Electron App (Frontend):**
- React 18 + TypeScript + Vite
- Multi-provider architecture via `IMusicProvider` interface
- OAuth callback handling via React Router
- Direct API calls to music providers
- AI services (commentary, TTS) run client-side

**OAuth Proxy (Backend):**
- .NET 8 isolated Azure Functions
- Three endpoints per provider: `/initiate`, `/exchange`, `/refresh`
- Azure Key Vault for client secrets
- Managed Identity authentication
- Device token authentication + rate limiting

**Music Providers:**
- YouTube Data API (fully implemented)
- Spotify Web API (architecture ready)
- Apple Music API (planned)

### Project Structure

```
electron-app/src/
├── components/         # React components (App, Settings, OnboardingWizard, etc.)
│   └── onboarding/     # Onboarding wizard step components
├── providers/          # IMusicProvider implementations
│   ├── YouTubeMusicProvider.ts   # ✅ Fully working
│   ├── SpotifyProvider.ts        # ⏸️ Architecture ready
│   └── AppleMusicProvider.ts     # ⏸️ Planned
├── services/           # AI commentary, TTS
├── styles/             # Design system
│   ├── tokens.css      # CSS custom properties (single source of truth)
│   ├── base.css        # Reset, focus-visible, reduced-motion
│   └── utilities.css   # Reusable button/card/input/chip classes
├── types/              # TypeScript interfaces
├── utils/              # Shared utilities (secretStorage, validateApiKey)
└── config/             # OAuth configuration, DI container

oauth-proxy/
├── Functions/          # Azure Function HTTP endpoints
├── Services/           # ISecretService, IDeviceAuthService, IStateStoreService
├── Models/             # DTOs for OAuth requests/responses
└── Program.cs          # Dependency injection setup

DJai.AppHost/           # .NET Aspire orchestrator
DJai.ServiceDefaults/   # Shared Aspire service defaults
infra/                  # Azure Bicep IaC modules
scripts/                # Setup scripts (setup-local.ps1, setup-cloud.ps1)
.github/workflows/      # CI/CD (ci.yml, deploy-oauth-proxy.yml, release-electron.yml)
```

## Key Conventions and Patterns

### Provider Interface Pattern

All music providers implement `IMusicProvider` with these core methods:
- `authenticate()` - Start OAuth flow
- `handleOAuthCallback(url)` - Process OAuth redirect
- `searchTracks(query)` - Search for music
- `playTrack(result)` - Start playback
- `getRecommendations(track)` - AI-powered suggestions
- `getUserTopTracks()` - Personalized content
- Playback controls: `pause()`, `play()`, `next()`, `previous()`

**When adding a new provider:**
1. Implement `IMusicProvider` in `electron-app/src/providers/`
2. Add OAuth endpoints in `oauth-proxy/Functions/{Provider}OAuthFunctions.cs`
3. Add provider to Settings UI
4. Update `docs/ARCHITECTURE.md`

### Commit Message Convention

Follow conventional commits format (from CONTRIBUTING.md):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### Environment Configuration

**Development secrets (NEVER commit):**
- Run `.\setup.ps1 --local` to configure dotnet user-secrets (injected by Aspire)
- `electron-app/.env.local` - Frontend OAuth client IDs

**Production secrets:**
- Run `.\setup.ps1 --cloud` to configure Azure Key Vault via azd
- Accessed via Managed Identity (no secrets in code/config)

### OAuth Security

**Device Authentication:**
- Each client generates a GUID stored in localStorage as `X-Device-Token`
- Used for rate limiting (1000/day, 100/hour per device)
- NOT cryptographic security (just basic abuse prevention)

**Client Secret Protection:**
- NEVER exposed to client (stored in Azure Key Vault)
- Backend fetches via Managed Identity
- Only backend performs token exchange

### Code Style

**TypeScript/React:**
- Functional components with hooks (no class components)
- TypeScript for all files (type safety required)
- Keep components small and focused
- Extract reusable logic into custom hooks

**CSS/Design System:**
- ALL visual values must reference CSS custom properties from `src/styles/tokens.css`
- Never hardcode hex colors, spacing pixels, or font sizes in component CSS
- Use utility classes from `src/styles/utilities.css` where available (`.btn-primary`, `.card`, `.input`, `.chip`, etc.)
- Component CSS files use BEM-like naming scoped by component (e.g., `.wizard-*`, `.mp-*`, `.ai-*`)
- No inline `style={}` for static styles — CSS files only (inline OK for truly dynamic runtime values)
- Include `:hover`, `:focus-visible`, and `@media` queries where appropriate
- No `!important` — fix specificity properly

**C#/.NET:**
- Follow standard C# naming conventions (PascalCase for public, camelCase for private)
- Use async/await for all async operations
- Dependency injection via `Program.cs`
- Document public APIs with XML comments

**Accessibility (WCAG AA baseline):**
- All interactive elements need `aria-label` if text content isn't descriptive
- Keyboard navigation: `tabIndex={0}` + `onKeyDown` (Enter/Space) on clickable non-button elements
- `aria-live="polite"` on dynamically updated content regions
- `role="slider"` with `aria-valuenow/min/max` on custom sliders
- `prefers-reduced-motion` respected globally (base.css handles this)

### Testing Expectations

Manual testing is current approach. When adding tests:
- **Frontend:** Use Playwright (already configured)
- **Backend:** Use xUnit for .NET unit tests
- Test OAuth flow end-to-end
- Verify no console errors
- Test on multiple platforms if changing core functionality

## Important Notes

- **Windows paths:** Use `\` for paths on Windows (not `/`)
- **Port conflicts:** Vite auto-increments from 5173 if port is busy
- **OAuth callback URL:** Must match `http://localhost:5173/oauth/callback` (or whichever port Vite uses)
- **CORS:** OAuth proxy allows localhost:5173-5177 in development
- **Token storage:** OAuth tokens in localStorage (standard OAuth pattern for desktop apps)
- **No automated deployments:** Deploy workflow is `workflow_dispatch` only (needs Azure service principal secrets in GitHub)

## CI/CD

- **ci.yml** — runs on every push: backend build, frontend build + typecheck, Electron package dry run (3 platforms)
- **deploy-oauth-proxy.yml** — `workflow_dispatch` only: deploys to Azure (staging → production with approval gate)
- **release-electron.yml** — triggered by version tags: builds Electron distributables on all platforms

## Documentation References

- **[DEV_SETUP.md](DEV_SETUP.md)** - Complete local development setup
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed architecture and design decisions
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deploy OAuth proxy to Azure
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[OAUTH_PROVIDERS_SUMMARY.md](OAUTH_PROVIDERS_SUMMARY.md)** - Provider-specific OAuth setup

## Current Status

✅ **Working:** YouTube Music provider, OAuth flow, Dev environment, Aspire orchestration, CI/CD pipelines, Onboarding wizard, Design token system
🚧 **In Progress:** Spotify provider, AI commentary, TTS
📋 **Planned:** Apple Music provider, GPU visualizations, Playlists
