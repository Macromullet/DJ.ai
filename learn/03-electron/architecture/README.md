# Electron Architecture: Multi-Process Model

## Overview

Electron applications run as multiple cooperating processes, each with distinct roles and capabilities. This architecture mirrors how modern web browsers work — Chrome itself uses the same Chromium engine that powers Electron's renderer processes.

Understanding this model is essential because it determines:
- **Where code runs** (Node.js vs browser sandbox)
- **What APIs are available** in each context
- **How data flows** between processes
- **What security boundaries** exist

## The Three Layers

```
┌──────────────────────────────────────────────┐
│                 Main Process                  │
│  Node.js runtime with full OS access         │
│  • Creates/manages BrowserWindows            │
│  • Handles IPC from all renderers            │
│  • Accesses file system, OS APIs, networking │
├──────────────────────────────────────────────┤
│              Preload Scripts                  │
│  Bridge layer with selective API exposure     │
│  • Runs before renderer content loads        │
│  • Has access to Node.js AND renderer APIs   │
│  • Uses contextBridge to safely expose APIs  │
├──────────────────────────────────────────────┤
│             Renderer Processes                │
│  Chromium browser instances (sandboxed)       │
│  • Render HTML/CSS/JavaScript                │
│  • No direct Node.js access                  │
│  • Communicate with main via preload bridge  │
└──────────────────────────────────────────────┘
```

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Main Process](./main-process.md) | Node.js runtime, window management, app lifecycle |
| [Renderer Process](./renderer-process.md) | Chromium instances, React rendering, sandboxing |
| [Preload Scripts](./preload-scripts.md) | Bridge layer, contextBridge API |
| [Context Isolation](./context-isolation.md) | Security boundary enforcement |

## Key Takeaways

- **One main process, many renderers** — the main process is the coordinator
- **Processes are isolated** — they communicate only through IPC
- **Preload scripts are the bridge** — they selectively expose main-process capabilities
- **Security by default** — renderers are sandboxed and cannot access Node.js

## DJ.ai Connection

DJ.ai runs three types of windows simultaneously: the main React UI, a hidden YouTube Music player window, and ephemeral OAuth login popups. Each gets its own renderer process with a tailored preload script. The main process in `electron-app/electron/main.cjs` orchestrates all of them — creating windows, routing IPC messages, managing the system tray, and handling deep links. The preload script (`preload.cjs`) defines exactly which capabilities the React app can use via `window.electron`.
