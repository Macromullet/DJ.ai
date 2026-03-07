# JavaScript

> Vanilla JavaScript for the Electron main process — CommonJS is still alive.

While DJ.ai's React frontend is written in TypeScript, the **Electron main process** (`electron/main.cjs`) and **preload script** (`electron/preload.cjs`) are written in plain JavaScript using the CommonJS module system. This is because Electron's main process runs in Node.js, and historically Electron has required CommonJS for its entry points. Understanding the differences between ESM and CJS, closures, and the event loop is essential for working with Electron's main process.

---

## Why Plain JavaScript in Electron?

1. **Electron main process** runs in Node.js, not a browser — it manages windows, IPC, and system tray
2. **CommonJS** (`.cjs`) is required because Electron resolves its main entry via `require()` internally
3. **No build step** — `main.cjs` and `preload.cjs` run directly without TypeScript compilation
4. **Security boundary** — the preload script is the bridge between Node.js (full system access) and the renderer (sandboxed)

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [ES Modules vs CommonJS](./es-modules-vs-commonjs.md) | Two module systems, when to use each |
| 2 | [Closures & Scope](./closures-and-scope.md) | Lexical scope, closure pitfalls, stale closures |
| 3 | [Event Loop](./event-loop.md) | Microtasks, macrotasks, async scheduling |

---

## 🔗 DJ.ai Connection

| File | JavaScript Usage |
|------|-----------------|
| `electron-app/electron/main.cjs` | Electron main process — window management, IPC handlers, tray, deep linking |
| `electron-app/electron/preload.cjs` | Context bridge — exposes `window.electron` API to renderer |
| `electron-app/electron/validation.cjs` | Content Security Policy builder, OAuth URL validation |

---

## 📖 Resources

- [JavaScript Guide (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — Comprehensive JavaScript reference
- [Node.js Documentation](https://nodejs.org/docs/latest/api/) — Node.js API reference
- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model) — Main vs renderer processes
