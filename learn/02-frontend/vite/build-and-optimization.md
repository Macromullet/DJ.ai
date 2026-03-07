# Vite Build and Optimization

> Production builds with tree shaking, code splitting, and minification — shipping DJ.ai to users.

When it's time to ship DJ.ai, Vite switches from its fast ESM dev server to a **Rollup-based production bundler**. The build process compiles TypeScript, eliminates dead code (tree shaking), splits code into optimal chunks, minifies everything, and produces a compact bundle that Electron loads from disk.

---

## Core Concepts

### The Build Process

Running `npm run build` in DJ.ai executes:

```bash
tsc && vite build
```

This is a two-step process:
1. **`tsc`** — TypeScript compiler type-checks all files (catches type errors)
2. **`vite build`** — Rollup bundles, tree shakes, and minifies the output

```
Source files (TypeScript + JSX)
  ↓  tsc --noEmit (type checking only)
  ↓  vite build (Rollup + esbuild)
  ↓
dist/
├── index.html            # Entry HTML
├── assets/
│   ├── index-[hash].js   # Main bundle (React, app code)
│   ├── index-[hash].css  # Compiled CSS
│   └── vendor-[hash].js  # Third-party libraries (optional chunk)
```

### Tree Shaking

Tree shaking removes unused code from the bundle. Because Vite uses ES modules (static imports), it can analyze which exports are actually used and eliminate the rest:

```typescript
// Three.js is huge — but DJ.ai only imports what it needs
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
// Tree shaking removes unused Three.js modules (physics, loaders, etc.)
```

This is why ES modules matter — `import { X }` is statically analyzable, while `require()` is not.

### Code Splitting

Vite automatically splits code into separate chunks for optimal loading:

- **Vendor chunk** — third-party libraries (React, Three.js, React Router)
- **App chunk** — your application code
- **Dynamic imports** — code loaded on demand

```typescript
// Dynamic import — loaded only when needed
const AudioVisualizer = React.lazy(() => import('./components/AudioVisualizer'));
```

For DJ.ai (packaged in Electron, loaded from disk), code splitting's main benefit is **cache efficiency** — vendor code doesn't change often, so Electron caches it separately.

### Minification

Vite uses **esbuild** for minification — 10-100x faster than terser. Minification:
- Removes whitespace and comments
- Shortens variable names
- Simplifies expressions
- Reduces bundle size by 50-70%

### Build Output

DJ.ai's production build produces a compact bundle:

```
dist/
├── index.html        (~1 KB)
├── assets/
│   ├── index.js      (~250 KB gzipped — React, app code, Three.js)
│   └── index.css     (~15 KB — all styles)
```

The `base: './'` config in `vite.config.ts` ensures assets use relative paths — critical for Electron's `file://` protocol in production:

```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // Relative paths for Electron file:// loading
});
```

### Verifying the Build

```bash
cd electron-app

# Type-check only (fast)
npx tsc --noEmit

# Full production build
npx vite build

# Preview the production build locally
npx vite preview
```

DJ.ai CI runs both checks on every push:
```yaml
# .github/workflows/ci.yml
- run: npx tsc --noEmit      # Type errors
- run: npx vite build         # Build errors, bundle size
```

---

## 🔗 DJ.ai Connection

- **`electron-app/vite.config.ts`** — `base: './'` for Electron compatibility; React plugin for JSX
- **`electron-app/package.json`** — `"build": "tsc && vite build"` — type-check then bundle
- **`electron-app/electron/main.cjs`** — Production mode loads `dist/index.html` via `file://` protocol
- **`.github/workflows/ci.yml`** — CI verifies both TypeScript compilation and Vite build succeed
- **`electron-app/package.json`** (electron-builder section) — Packages `dist/` directory into the Electron app

---

## 🎯 Key Takeaways

- **`npm run build`** = `tsc` (type-check) + `vite build` (bundle) — always run both
- **Tree shaking** removes unused code — only import what you need from large libraries
- **`base: './'`** is required for Electron's `file://` protocol in production
- **esbuild** handles minification (fast) and TypeScript transpilation
- **Rollup** handles bundling, code splitting, and tree shaking
- CI verifies every push builds successfully — broken builds don't merge

---

## 📖 Resources

- [Building for Production](https://vite.dev/guide/build) — Official Vite build guide
- [Rollup](https://rollupjs.org/) — The bundler Vite uses for production
- [esbuild](https://esbuild.github.io/) — The transpiler/minifier Vite uses
- [Tree Shaking (MDN)](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) — Dead code elimination
