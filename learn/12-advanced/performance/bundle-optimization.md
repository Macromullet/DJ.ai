# Bundle Optimization

## The Concept

**Bundle optimization** reduces the size and loading time of JavaScript shipped to users. Modern bundlers (Vite, webpack, Rollup) apply several techniques:

| Technique | Description | Impact |
|-----------|-------------|--------|
| **Tree shaking** | Remove unused exports | Eliminates dead code |
| **Code splitting** | Split code into lazy-loaded chunks | Faster initial load |
| **Minification** | Shorten variable names, remove whitespace | 30-50% size reduction |
| **Compression** | gzip/brotli on the wire | 60-80% transfer reduction |

### Tree Shaking

Tree shaking eliminates code that's imported but never used. It works by analyzing ES module `import`/`export` statements at build time:

```typescript
// math.ts — exports two functions
export function add(a: number, b: number) { return a + b; }
export function multiply(a: number, b: number) { return a * b; }

// app.ts — only uses add
import { add } from './math';
console.log(add(1, 2));

// After tree shaking: multiply is removed from the bundle
```

**Requirement:** Tree shaking only works with ES modules (`import`/`export`), not CommonJS (`require`/`module.exports`).

## DJ.ai's Build Configuration

DJ.ai uses **Vite** (powered by Rollup) for production builds:

```bash
cd electron-app
npx vite build
```

### Build Output

```
dist/
├── index.html                      (1 KB)
├── assets/
│   ├── index-[hash].js            (~319 KB)
│   ├── index-[hash].css           (~15 KB)
│   └── vendor-[hash].js           (React, etc.)
```

### How Vite Optimizes

1. **Tree shaking** — Removes unused code from React and utility libraries
2. **Minification** — Terser or esbuild minifies JS, removing comments and shortening names
3. **CSS optimization** — Removes unused CSS, minifies, and deduplicates
4. **Asset hashing** — Filenames include content hashes for cache busting

### Code Splitting (Lazy Loading)

For components that aren't needed on initial load:

```typescript
// Lazy load heavy components
const HeavyComponent = React.lazy(() =>
  import('./components/HeavyComponent')
);

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {showComponent && <HeavyComponent />}
    </Suspense>
  );
}
```

This creates a separate chunk that's only downloaded when the component is displayed.

### Analyzing the Bundle

Use Vite's built-in visualizer to find optimization opportunities:

```bash
npx vite-bundle-visualizer
```

This generates a treemap showing which dependencies consume the most space.

### Electron Considerations

In Electron, "download size" matters for the installer but not for page loads (everything is local). However, smaller bundles still mean:
- **Faster startup** — Less JavaScript to parse
- **Lower memory** — Smaller AST in V8
- **Faster updates** — Smaller differential downloads

## DJ.ai Connection

DJ.ai's production build via `npx vite build` produces a ~319KB JavaScript bundle (before compression) — compact for an application with React, OAuth, TTS, and music provider integrations. Tree shaking removes unused exports from libraries. If heavy dependencies like Three.js are added in the future (e.g., for the planned GPU visualizer), code splitting with `React.lazy()` will keep initial load times fast.

## Key Takeaways

- Tree shaking removes unused code — use ES modules (`import`/`export`) to enable it
- Code splitting with `React.lazy()` defers heavy dependencies until needed
- Vite's Rollup-based build handles minification, tree shaking, and code splitting automatically
- Always measure with bundle analysis before optimizing — optimize the biggest chunks first

## Further Reading

- [Vite: Build Options](https://vite.dev/guide/build.html#chunking-strategy)
- [MDN: Tree Shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)
- [web.dev: Code Splitting](https://web.dev/articles/reduce-javascript-payloads-with-code-splitting)
