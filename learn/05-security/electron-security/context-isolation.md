# Context Isolation

## What Is Context Isolation?

Context isolation ensures that the **preload script** and **Electron's internal logic** run in a separate JavaScript context from the **web page**. Without it, web content can modify built-in JavaScript prototypes and intercept Electron API calls.

## The Threat: Prototype Pollution

Without context isolation, web content shares the same JavaScript context as the preload script:

```javascript
// ❌ WITHOUT context isolation — web page can attack preload
// Malicious web content:
Array.prototype.join = function() {
  // Intercept all array.join() calls in preload script
  // Steal data, modify behavior, escalate to RCE
};

Object.defineProperty(Object.prototype, 'then', {
  get() { /* Intercept all Promise resolutions */ }
});
```

The preload script unknowingly uses these poisoned prototypes, and the attacker gains control.

## The Fix: Context Isolation

With `contextIsolation: true`, Electron runs the preload in a separate V8 context. The web page cannot modify the preload's prototypes. Communication only happens through `contextBridge.exposeInMainWorld()`.

```javascript
// electron-app/electron/main.cjs — Window creation
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,       // ← No Node.js in renderer
    contextIsolation: true,       // ← Separate JS contexts
    preload: path.join(__dirname, 'preload.cjs'),  // ← Controlled bridge
  }
});
```

```javascript
// electron-app/electron/preload.cjs — The bridge
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Only expose specific, validated functions
  ytMusic: {
    onPlayPause: (cb) => ipcRenderer.on('yt-play-pause', cb),
    onNext: (cb) => ipcRenderer.on('yt-next', cb),
  },
  aiProxy: {
    request: (options) => ipcRenderer.invoke('ai-api-request', options),
    ttsRequest: (options) => ipcRenderer.invoke('ai-tts-request', options),
  },
  safeStorage: {
    encrypt: (data) => ipcRenderer.invoke('safe-storage-encrypt', data),
    decrypt: (data) => ipcRenderer.invoke('safe-storage-decrypt', data),
  },
});
```

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/electron/main.cjs` | Sets `nodeIntegration: false`, `contextIsolation: true` for all windows |
| `electron-app/electron/preload.cjs` | Exposes minimal API surface via `contextBridge` |
| `electron-app/src/types/electron.d.ts` | TypeScript types for the exposed API (ensures renderer uses correct types) |

### What DJ.ai Exposes

The preload script exposes exactly these APIs — nothing more:

| Namespace | Functions | Purpose |
|-----------|-----------|---------|
| `electron.ytMusic` | Play/pause, next, prev event handlers | YouTube Music media key integration |
| `electron.oauth` | Deep link handler | OAuth callback routing |
| `electron.aiProxy` | `request()`, `ttsRequest()` | AI API proxy (bypasses CORS) |
| `electron.safeStorage` | `encrypt()`, `decrypt()` | OS keychain for API keys |
| `electron.notifications` | `show()` | System notifications |
| `electron.tray` | Track info updates | System tray integration |

## Key Takeaways

- **Always enable** `contextIsolation: true` — it's the default since Electron 12
- **Always disable** `nodeIntegration` — giving web content Node.js access is game over
- Use `contextBridge.exposeInMainWorld()` to expose only the minimum necessary API
- The web page accesses the API via `window.electron.*` — it cannot reach Node.js directly
- TypeScript types (`electron.d.ts`) help ensure the renderer only calls valid methods

## References

- [Electron — Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron — Security Checklist #3](https://www.electronjs.org/docs/latest/tutorial/security#3-enable-context-isolation)
- [OWASP — Prototype Pollution](https://owasp.org/www-community/attacks/Prototype_Pollution)
