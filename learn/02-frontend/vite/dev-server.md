# Vite Dev Server

> Hot Module Replacement, native ESM serving, and Aspire integration — DJ.ai's development experience.

Vite's dev server is the foundation of DJ.ai's development workflow. Unlike traditional bundlers (webpack) that rebuild the entire app on every change, Vite serves source files directly over native ES modules and uses **Hot Module Replacement (HMR)** to update only the changed module — without a full page reload. This keeps the feedback loop under 100ms even as the codebase grows.

---

## Core Concepts

### How Vite's Dev Server Works

```
Traditional bundler (webpack):
  Source → Bundle entire app → Serve bundle → Browser
  (Slow: 5-30 seconds on change)

Vite:
  Source → Serve individual ESM files → Browser resolves imports
  (Fast: <100ms on change, instant server start)
```

Vite achieves this by:
1. **Pre-bundling dependencies** — React, React Router, etc. are bundled once with esbuild (10-100x faster than webpack)
2. **Serving source as ESM** — your `.tsx` files are transpiled on-demand and served as ES modules
3. **Updating only changed modules** — HMR sends the updated module to the browser via WebSocket

### Hot Module Replacement (HMR)

HMR updates the running application without losing state. When you edit a React component, Vite replaces just that component — your form inputs, scroll position, and React state are preserved:

```
1. You edit Settings.tsx
2. Vite detects the file change
3. Vite transpiles only Settings.tsx (esbuild: ~1ms)
4. Vite sends the new module via WebSocket
5. React re-renders Settings with preserved state
```

React's HMR is powered by `@vitejs/plugin-react`, which DJ.ai includes in `vite.config.ts`.

### Port Configuration

DJ.ai's dev server runs on port **5173** (Vite's default):

```typescript
// electron-app/vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
  },
});
```

```json
// electron-app/package.json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173"
  }
}
```

**Important considerations:**
- **OAuth callback URL** must match `http://localhost:5173/oauth/callback` (registered with providers)
- **CORS configuration** in the OAuth proxy allows `localhost:5173-5177`
- If port 5173 is busy, Vite auto-increments to 5174, 5175, etc.
- The `--host 0.0.0.0` flag allows access from other machines (used by Aspire)

### Aspire Integration

.NET Aspire starts the Vite dev server as part of the orchestrated development environment:

```csharp
// DJai.AppHost/Program.cs
var frontend = builder.AddViteApp("frontend", "../electron-app")
    .WithHttpEndpoint(targetPort: 5173);
```

Key Aspire gotcha: use `targetPort: 5173` (the port Vite listens on), not `port: 5173` (which would conflict with Aspire's DCP port allocation).

### SPA Fallback

Vite's dev server automatically serves `index.html` for all routes that don't match a file. This is critical for React Router — when the browser navigates to `/oauth/callback`, Vite serves `index.html`, and React Router renders the matching component.

---

## 🔗 DJ.ai Connection

- **`electron-app/vite.config.ts`** — Configures port 5173, React plugin, and base path
- **`electron-app/package.json`** — `"dev"` script: `vite --host 0.0.0.0 --port 5173`
- **`electron-app/electron/main.cjs`** — In dev mode, loads `http://localhost:5173`; in production, loads `dist/index.html`
- **`DJai.AppHost/Program.cs`** — Aspire orchestrates the Vite dev server alongside the OAuth proxy and Redis
- **`oauth-proxy/`** — CORS allows `localhost:5173-5177` for development

---

## 🎯 Key Takeaways

- Vite serves files as **native ESM** in development — no bundling, instant start
- **HMR** updates only the changed module — preserving React state
- Port **5173** is DJ.ai's standard dev port — OAuth callback URLs depend on it
- Aspire uses `targetPort: 5173` (not `port`) to avoid port conflicts
- The dev server provides **SPA fallback** — all routes serve `index.html` for React Router
- Pre-bundling with **esbuild** makes dependency resolution fast (React, React Router, etc.)

---

## 📖 Resources

- [Vite Dev Server](https://vite.dev/guide/) — Getting started with development
- [Server Options](https://vite.dev/config/server-options) — Port, host, proxy configuration
- [HMR API](https://vite.dev/guide/api-hmr) — How Hot Module Replacement works
- [Dependency Pre-Bundling](https://vite.dev/guide/dep-pre-bundling) — Why and how Vite pre-bundles deps
