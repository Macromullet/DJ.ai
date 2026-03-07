# Vite

> DJ.ai's build tool — lightning-fast development server and optimized production bundler.

Vite (French for "fast") is a modern build tool that provides instant server start, sub-second hot module replacement (HMR), and optimized production builds. DJ.ai uses Vite to serve the React frontend during development and to produce the final JavaScript bundle shipped inside the Electron app.

---

## Why DJ.ai Uses Vite

1. **Instant server start** — Vite serves source files over native ESM, no bundling needed for development
2. **Sub-second HMR** — edit a component, see the change immediately without losing state
3. **Optimized production builds** — Rollup-based bundling with tree shaking, code splitting, and minification
4. **TypeScript support** — native `.tsx` handling with `esbuild` for fast transpilation
5. **Simple configuration** — DJ.ai's `vite.config.ts` is under 15 lines

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Dev Server](./dev-server.md) | HMR, module graph, port configuration |
| 2 | [Build & Optimization](./build-and-optimization.md) | Tree shaking, code splitting, production builds |
| 3 | [Configuration](./config.md) | vite.config.ts, plugins, customization |

---

## 🔗 DJ.ai Connection

| File | Vite Usage |
|------|-----------|
| `electron-app/vite.config.ts` | Build configuration — plugins, port, base path |
| `electron-app/package.json` | `"dev"` script runs Vite; `"build"` runs tsc + Vite build |
| `DJai.AppHost/Program.cs` | Aspire uses `AddNpmApp` / `AddViteApp` to start the dev server |

---

## 📖 Resources

- [Vite Documentation](https://vite.dev/guide/) — Official getting started guide
- [Why Vite](https://vite.dev/guide/why.html) — The problems Vite solves
- [Vite GitHub](https://github.com/vitejs/vite) — Source code and issues
