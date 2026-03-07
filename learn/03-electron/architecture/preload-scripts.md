# Preload Scripts

## What Are Preload Scripts?

Preload scripts are special JavaScript files that execute in the renderer process **before** web content loads, but with access to a limited set of Node.js and Electron APIs. They serve as the controlled bridge between the sandboxed renderer and the privileged main process.

The key API is `contextBridge.exposeInMainWorld()`, which safely injects objects into the renderer's `window` global — without giving the renderer direct access to Node.js.

## How contextBridge Works

```javascript
// preload.cjs — runs before renderer content loads
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  safeStorage: {
    encrypt: (plaintext) => ipcRenderer.invoke('safe-storage-encrypt', plaintext),
    decrypt: (encrypted) => ipcRenderer.invoke('safe-storage-decrypt', encrypted),
    isAvailable: () => ipcRenderer.invoke('safe-storage-available')
  }
});
```

After this runs, renderer code can call `window.electron.safeStorage.encrypt('secret')` — but it cannot access `ipcRenderer` directly or call any IPC channel not explicitly exposed.

## Why Not Just Expose ipcRenderer?

Exposing `ipcRenderer` directly would let the renderer send messages to **any** IPC channel, including ones that access the file system or execute commands. The preload pattern ensures:

1. **Allowlisted channels only** — renderer can only call methods you explicitly define
2. **Argument validation** — preload can sanitize inputs before forwarding
3. **API abstraction** — renderer code doesn't know about IPC internals

```javascript
// ❌ DANGEROUS: exposes all IPC channels
contextBridge.exposeInMainWorld('ipc', ipcRenderer);

// ✅ SAFE: exposes only specific operations
contextBridge.exposeInMainWorld('electron', {
  ytMusic: {
    playUrl: (url) => ipcRenderer.invoke('yt-music-play-url', url),
    control: (action) => ipcRenderer.invoke('yt-music-control', action),
    getTrack: () => ipcRenderer.invoke('yt-music-get-track')
  }
});
```

## Listening for Main-to-Renderer Events

Preload scripts also expose event listeners for messages the main process sends to the renderer:

```javascript
tray: {
  onPlaybackToggle: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-playback-toggle', handler);
    return () => ipcRenderer.removeListener('tray-playback-toggle', handler);
  }
}
```

The returned cleanup function enables React components to unsubscribe in `useEffect` teardowns.

## Key Links

- [Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts)
- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge)

## Key Takeaways

- Preload scripts run **before** page content with access to limited Node.js APIs
- `contextBridge.exposeInMainWorld()` is the **only safe way** to give renderers main-process access
- Never expose `ipcRenderer` directly — always wrap in specific method calls
- Return cleanup functions for event listeners to prevent memory leaks

## DJ.ai Connection

DJ.ai's preload script (`electron-app/electron/preload.cjs`) exposes the `window.electron` object with six namespaces: `ytMusic` (playback), `oauthDeepLink` (OAuth callbacks), `aiProxy` (AI commentary and TTS), `safeStorage` (encryption), `notifications` (desktop alerts), and `tray` (system tray events). Each namespace wraps specific IPC channels — the React app at `electron-app/src/` interacts with these as simple async function calls, never knowing about the IPC layer underneath.
