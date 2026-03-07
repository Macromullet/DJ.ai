# ES Modules vs CommonJS

> Two module systems, one codebase — understanding when DJ.ai uses each.

JavaScript has two major module systems: **ES Modules (ESM)** — the modern standard using `import`/`export`, and **CommonJS (CJS)** — the Node.js original using `require()`/`module.exports`. DJ.ai uses **both**: React code in `electron-app/src/` uses ESM (transpiled by Vite), while Electron's main process files (`main.cjs`, `preload.cjs`) use CommonJS.

---

## Core Concepts

### CommonJS (CJS)

CommonJS was created for Node.js before ES modules existed. It uses synchronous `require()` to load modules and `module.exports` to expose values:

```javascript
// electron/main.cjs — CommonJS
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
}

module.exports = { createWindow };
```

Key characteristics:
- **Synchronous** — `require()` blocks until the module is loaded
- **Dynamic** — you can `require()` inside conditionals or functions
- **`.cjs` extension** — explicitly signals CommonJS (or `.js` if `"type": "commonjs"` in package.json)
- **`__dirname` / `__filename`** — available as globals

### ES Modules (ESM)

ES modules are the JavaScript standard, supported by browsers and modern Node.js. They use `import`/`export` with static analysis:

```typescript
// electron-app/src/App.tsx — ES Modules (TypeScript, transpiled by Vite)
import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { IMusicProvider, SearchResult, Track } from './types';
import { SpotifyProvider } from './providers';
import { Settings } from './components/Settings';
import { Toast, useToast } from './components/Toast';

export default function App() {
  // ... component code
}
```

Key characteristics:
- **Asynchronous** — modules are loaded asynchronously
- **Static** — imports must be at the top level (enables tree shaking)
- **Named and default exports** — `export { foo }` and `export default bar`
- **No `__dirname`** — use `import.meta.url` and `new URL()` instead

### Side-by-Side Comparison

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | Synchronous | Asynchronous |
| Analysis | Dynamic (runtime) | Static (compile-time) |
| Tree shaking | ❌ Not possible | ✅ Dead code eliminated |
| Top-level await | ❌ No | ✅ Yes |
| `this` at top level | `module.exports` | `undefined` |
| File extension | `.cjs` or `.js` | `.mjs` or `.js` (with `"type": "module"`) |

### Why DJ.ai Uses Both

```
electron-app/
├── electron/
│   ├── main.cjs          ← CommonJS (Electron main process)
│   ├── preload.cjs        ← CommonJS (Electron preload)
│   └── validation.cjs     ← CommonJS (CSP builder)
├── src/
│   ├── App.tsx            ← ESM (React, transpiled by Vite)
│   ├── types/             ← ESM
│   ├── providers/         ← ESM
│   ├── services/          ← ESM
│   └── config/            ← ESM
└── package.json           ← Does NOT set "type": "module"
```

**Electron's main process** requires CommonJS because:
1. Electron resolves its entry point via `require()` internally
2. Node.js APIs like `path.join(__dirname, ...)` are CJS patterns
3. The `.cjs` extension explicitly declares the module format regardless of package.json settings

**React/Vite code** uses ESM because:
1. Vite expects ESM — it performs tree shaking and HMR via ESM imports
2. TypeScript compiles to ESM (configured in `tsconfig.json`)
3. Static imports enable IDE features like auto-import and go-to-definition

### Dynamic Import (ESM in CJS)

You can dynamically import ESM modules from CommonJS using `import()`:

```javascript
// In a .cjs file — dynamic import returns a promise
async function loadModule() {
  const { default: chalk } = await import('chalk');
  console.log(chalk.green('Loaded ESM module from CJS'));
}
```

---

## 🔗 DJ.ai Connection

- **`electron-app/electron/main.cjs`** — CommonJS main process: `require('electron')`, `require('path')`, `module.exports` patterns; uses `__dirname` for path resolution
- **`electron-app/electron/preload.cjs`** — CommonJS preload: `require('electron').contextBridge` exposes APIs to the renderer
- **`electron-app/src/App.tsx`** — ESM imports for React, providers, services, components
- **`electron-app/src/providers/index.ts`** — ESM re-exports: `export { SpotifyProvider } from './SpotifyProvider'`
- **`electron-app/src/types/index.ts`** — ESM barrel file re-exporting all type definitions
- **`electron-app/vite.config.ts`** — ESM configuration file consumed by Vite

---

## 🎯 Key Takeaways

- DJ.ai uses **CommonJS** for Electron main/preload scripts and **ESM** for React/Vite code
- The `.cjs` extension explicitly forces CommonJS interpretation
- **ESM** enables tree shaking (dead code elimination) — critical for bundle size
- **CommonJS** is synchronous and dynamic; **ESM** is asynchronous and static
- You can use `import()` (dynamic) to load ESM from CJS, but not `require()` for ESM
- Understanding both systems is essential because DJ.ai's code crosses the boundary between them

---

## 📖 Resources

- [JavaScript Modules (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) — ESM guide
- [Node.js Modules: CommonJS](https://nodejs.org/api/modules.html) — CJS reference
- [Node.js Modules: ECMAScript](https://nodejs.org/api/esm.html) — ESM in Node.js
- [Vite — Features](https://vite.dev/guide/features.html) — How Vite handles modules
