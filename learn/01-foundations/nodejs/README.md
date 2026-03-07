# Node.js

> The runtime that powers Electron, Vite, and DJ.ai's development toolchain.

Node.js is a JavaScript runtime built on Chrome's V8 engine. It lets JavaScript run outside the browser, providing access to the file system, network, and operating system. In DJ.ai, Node.js is the runtime for three critical roles: the **Electron main process** (window management, IPC, system tray), the **Vite dev server** (HMR, module bundling), and **npm** (package management, build scripts).

---

## Why Node.js Matters for DJ.ai

1. **Electron** embeds Node.js — `main.cjs` has full access to `fs`, `path`, `os`, and `child_process`
2. **Vite** runs on Node.js — it serves React code during development with HMR
3. **npm** manages all frontend dependencies and build scripts
4. **Build tooling** — TypeScript compiler, Playwright, Electron Builder all run on Node.js

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Package Management](./package-management.md) | npm, package.json, lock files, semver |
| 2 | [Streams & Buffers](./streams-and-buffers.md) | Buffer, ArrayBuffer, Blob, base64 encoding |

---

## 🔗 DJ.ai Connection

| File | Node.js Usage |
|------|---------------|
| `electron-app/electron/main.cjs` | Full Node.js APIs: `path`, `require`, `app` |
| `electron-app/package.json` | npm scripts, dependencies, Electron builder config |
| `electron-app/vite.config.ts` | Vite dev server configuration (runs on Node.js) |

---

## 📖 Resources

- [Node.js Documentation](https://nodejs.org/docs/latest/api/) — Official API reference
- [Node.js Guides](https://nodejs.org/en/learn) — Getting started and core concepts
- [About Node.js](https://nodejs.org/en/about) — Architecture and design philosophy
