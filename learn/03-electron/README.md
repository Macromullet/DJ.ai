# 03 — Electron: Desktop Apps with Web Technology

## Why Electron?

Electron enables building cross-platform desktop applications using HTML, CSS, and JavaScript — the same technologies that power the web. Instead of learning platform-specific frameworks (WPF for Windows, Cocoa for macOS, GTK for Linux), you write one codebase that runs everywhere. Electron bundles Chromium (for rendering) and Node.js (for system access) into a single runtime.

For DJ.ai, Electron is the natural choice: a music player needs native OS integration (system tray, media keys, notifications) while also rendering a rich React-based UI. Electron provides both, letting us build a Spotify-like desktop experience without three separate codebases.

## Multi-Process Architecture

Electron's architecture mirrors web browsers. Every Electron app has exactly **one main process** (Node.js) and one or more **renderer processes** (Chromium). They communicate via **Inter-Process Communication (IPC)**:

```
┌─────────────────┐       IPC        ┌──────────────────┐
│   Main Process   │ ◄──────────────► │ Renderer Process  │
│   (Node.js)      │                  │ (Chromium/React)  │
│                  │                  │                   │
│ • Window mgmt   │    preload.cjs   │ • UI rendering    │
│ • System tray   │ ◄──────────────► │ • User interaction│
│ • File system   │   (bridge layer) │ • API calls       │
│ • OS APIs       │                  │ • State mgmt      │
└─────────────────┘                  └──────────────────┘
```

This separation enforces security: renderer processes are sandboxed and cannot directly access Node.js APIs. The preload script acts as a controlled bridge.

## Learning Path

| Order | Topic | File |
|-------|-------|------|
| 1 | Multi-process architecture | [architecture/](./architecture/) |
| 2 | Inter-Process Communication | [ipc/](./ipc/) |
| 3 | Security best practices | [security/](./security/) |
| 4 | Native OS integration | [system-integration/](./system-integration/) |
| 5 | App packaging & distribution | [packaging/](./packaging/) |

## Key Links

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Process Model Tutorial](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Fiddle](https://www.electronjs.org/fiddle) — experiment with APIs interactively

## DJ.ai Connection

DJ.ai's Electron layer lives in `electron-app/electron/`. The main process (`main.cjs`) manages multiple windows — the primary React app, a hidden YouTube Music player, and OAuth login popups. The preload script (`preload.cjs`) exposes a carefully curated API surface (`window.electron`) that the React renderer uses for playback control, AI requests, secure storage, and system tray updates. This architecture ensures the renderer never gets direct Node.js access while still enabling deep OS integration.
