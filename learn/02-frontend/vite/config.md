# Vite Configuration

> vite.config.ts — customizing DJ.ai's build tool for React, Electron, and Aspire.

Vite is configured via `vite.config.ts` at the project root. DJ.ai's configuration is intentionally minimal — Vite's sensible defaults handle most use cases. The configuration adds the React plugin (for JSX/HMR), sets a relative base path (for Electron's file:// protocol), and configures the dev server port.

---

## Core Concepts

### DJ.ai's vite.config.ts

```typescript
// electron-app/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
});
```

That's it. Three configuration options power the entire DJ.ai frontend build.

### Configuration Breakdown

#### `plugins: [react()]`

The `@vitejs/plugin-react` plugin provides:
- **JSX transformation** — converts JSX/TSX to JavaScript
- **Fast Refresh** — React-aware HMR that preserves component state
- **Automatic JSX runtime** — no need for `import React from 'react'` in every file

Without this plugin, Vite wouldn't know how to handle `.tsx` files.

#### `base: './'`

Sets the base path for all asset URLs. The default is `/` (absolute), but Electron loads the built app via `file://` protocol, where absolute paths don't resolve correctly:

```html
<!-- base: '/' (default) — BROKEN in Electron file:// -->
<script src="/assets/index-abc123.js"></script>

<!-- base: './' — WORKS in Electron file:// -->
<script src="./assets/index-abc123.js"></script>
```

#### `server.port: 5173`

Fixes the dev server port. This is important because:
- OAuth callback URLs are registered as `http://localhost:5173/oauth/callback`
- The OAuth proxy CORS allows `localhost:5173-5177`
- Aspire connects to the frontend via `targetPort: 5173`
- Electron's main process loads `http://localhost:5173` in dev mode

### Environment Variables

Vite exposes environment variables prefixed with `VITE_` to client code:

```typescript
// electron-app/src/config/environment.ts
const config = {
  oauthProxyUrl: import.meta.env.VITE_OAUTH_PROXY_URL || null,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
```

Environment variables are set via `.env` files:

```
# electron-app/.env.local (not committed)
VITE_OAUTH_PROXY_URL=http://localhost:7071/api
```

**Security note:** Any variable prefixed with `VITE_` is embedded in the client bundle and visible to users. Never put secrets (API keys, client secrets) in `VITE_` variables.

### Common Configuration Options

While DJ.ai keeps it simple, here are options you might add:

```typescript
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    // Proxy API calls to avoid CORS in development
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Custom output directory
    outDir: 'dist',
    // Source maps for debugging production builds
    sourcemap: true,
    // Rollup options
    rollupOptions: {
      output: {
        // Manual chunk splitting
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          three: ['three'],
        },
      },
    },
  },
  resolve: {
    // Path aliases
    alias: {
      '@': '/src',
      '@components': '/src/components',
    },
  },
});
```

DJ.ai doesn't use most of these because:
- **No proxy** — the OAuth proxy handles CORS itself
- **No aliases** — the project is small enough that relative imports are clear
- **No manual chunks** — Rollup's automatic splitting is sufficient
- **No source maps** — not needed for Electron (can enable for debugging)

### TypeScript Configuration

Vite uses `tsconfig.json` for TypeScript settings but **does not type-check** during dev or build. Type checking is a separate step:

```bash
npx tsc --noEmit    # Type-check only
npx vite build      # Build only (no type checking)
tsc && vite build   # Both (DJ.ai's "build" script)
```

This separation is intentional — Vite uses esbuild for transpilation (fast, but no type checking), and tsc handles type checking (thorough, but slower).

---

## 🔗 DJ.ai Connection

- **`electron-app/vite.config.ts`** — The configuration file itself; defines React plugin, base path, and server port
- **`electron-app/src/config/environment.ts`** — Reads `import.meta.env.VITE_OAUTH_PROXY_URL` for the backend URL
- **`electron-app/.env.local`** — Local environment variables (not committed to Git)
- **`electron-app/package.json`** — `"build": "tsc && vite build"` — combines type checking with bundling
- **`DJai.AppHost/Program.cs`** — Aspire's `AddViteApp` relies on the configured port

---

## 🎯 Key Takeaways

- DJ.ai's Vite config is **minimal by design** — sensible defaults handle most needs
- **`base: './'`** is essential for Electron's `file://` protocol
- **`@vitejs/plugin-react`** enables JSX, Fast Refresh HMR, and automatic runtime
- **`VITE_` prefix** variables are client-visible — never put secrets there
- Vite **does not type-check** — that's `tsc`'s job; the build script runs both
- Port **5173** must match OAuth callback URLs, CORS config, and Aspire setup

---

## 📖 Resources

- [Configuring Vite](https://vite.dev/config/) — Full configuration reference
- [Shared Options](https://vite.dev/config/shared-options) — Common options (base, plugins, resolve)
- [Server Options](https://vite.dev/config/server-options) — Dev server configuration
- [Build Options](https://vite.dev/config/build-options) — Production build options
- [Env Variables](https://vite.dev/guide/env-and-mode) — Environment variable handling
