# DJ.ai — Electron App

AI-powered music DJ with cross-platform support via Electron, React 18, TypeScript, and Vite.

## Music Providers

| Provider | Status | Notes |
|---|---|---|
| YouTube Music | ✅ Fully working | OAuth via proxy, direct API calls |
| Spotify | ✅ Wired | OAuth via proxy, direct API calls |
| Apple Music | ✅ Wired | OAuth via proxy, direct API calls |

## Architecture

The backend OAuth proxy (`../oauth-proxy/`) handles **only** token exchange — client secrets never leave the server. All music API calls (search, playback, recommendations) are made **directly** from the Electron app to the providers using the OAuth access tokens.

AI API keys (OpenAI, Anthropic) are stored encrypted via Electron `safeStorage`. All AI API calls are routed through Electron IPC to the main process to avoid browser CORS restrictions.

OAuth callbacks in packaged builds use the `djai://` deep link protocol. In development, they use `http://localhost:5173/oauth/callback`.

## Project Structure

```
electron-app/
├── electron/
│   ├── main.cjs           # Window management, IPC, CSP, OAuth popup, safeStorage
│   └── preload.cjs        # Context bridge (secure renderer ↔ main API)
├── src/
│   ├── components/        # React components
│   │   ├── onboarding/    # First-launch onboarding wizard steps
│   │   ├── OnboardingWizard.tsx/.css
│   │   ├── Settings.tsx/.css
│   │   ├── AudioVisualizer.tsx/.css
│   │   ├── TrackProgressBar.tsx/.css
│   │   ├── VolumeControl.tsx/.css
│   │   ├── OAuthCallback.tsx
│   │   └── ErrorBoundary.tsx
│   ├── providers/         # IMusicProvider implementations
│   │   ├── YouTubeMusicProvider.ts   # ✅ Fully working
│   │   ├── SpotifyProvider.ts        # ✅ Wired
│   │   └── AppleMusicProvider.ts     # ✅ Wired
│   ├── services/          # AI commentary, TTS
│   ├── styles/            # Design token system
│   │   ├── tokens.css     # 120+ CSS custom properties
│   │   ├── base.css       # Reset, scrollbar, focus-visible
│   │   └── utilities.css  # Buttons, cards, inputs, chips
│   ├── types/             # TypeScript interfaces (IMusicProvider, etc.)
│   ├── utils/             # API key validation, helpers
│   ├── config/            # OAuth configuration
│   ├── App.tsx            # Main app component
│   ├── App.css            # Main stylesheet (token-based)
│   └── main.tsx           # Entry point
├── package.json
├── vite.config.ts
├── tsconfig.json
└── playwright.config.ts
```

## Development

**Recommended — via .NET Aspire (starts OAuth proxy + Electron app together):**
```bash
dotnet run --project ../DJai.AppHost
```

**Standalone:**
```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
```

**As an Electron window:**
```bash
npm run electron:dev
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server (port 5173) |
| `npm run build` | TypeScript compile + Vite build |
| `npm run electron:dev` | Run app in Electron window |
| `npm run electron:build` | Build distributable package |
| `npm test` | Run Playwright end-to-end tests |
| `npm run test:headed` | Playwright in headed mode |

## Design System

All visual values are defined as CSS custom properties in `src/styles/tokens.css` — no hardcoded hex values or magic numbers in component styles. Components reference tokens (e.g. `var(--color-primary)`, `var(--spacing-md)`). Reusable utility classes for buttons, cards, inputs, and chips are in `src/styles/utilities.css`.

## Key Dependencies

- `react` 18, `react-dom`, `react-router-dom`
- `electron`, `electron-builder`
- `vite`, `typescript`
- `@playwright/test`

## Documentation

- [`../DEV_SETUP.md`](../DEV_SETUP.md) — Local development setup
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) — System architecture and design decisions
- [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) — Deploy OAuth proxy to Azure
- [`../docs/RELEASING.md`](../docs/RELEASING.md) — Release process
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — Contribution guidelines
