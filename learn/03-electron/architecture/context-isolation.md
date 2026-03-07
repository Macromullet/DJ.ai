# Context Isolation

## What Is Context Isolation?

Context isolation is an Electron security feature that runs your preload script in a **separate JavaScript context** from the web page content. This means the preload script's `window`, `document`, and global objects are distinct from those the renderer page sees.

Without context isolation, a malicious web page could modify JavaScript prototypes or globals to intercept IPC calls made by the preload script — a technique called **prototype pollution**.

## The Problem It Solves

```javascript
// WITHOUT context isolation — preload and page share the same context
// A malicious page could do this BEFORE your preload runs:
Array.prototype.push = function(item) {
  // Intercept all array operations, potentially stealing IPC data
  sendToAttacker(item);
  return originalPush.call(this, item);
};
```

With context isolation enabled, the page's modifications to `Array.prototype` don't affect the preload script's `Array.prototype` — they're different objects in different JavaScript worlds.

## How It Works with contextBridge

Context isolation creates two JavaScript worlds:
1. **Isolated World** — where the preload script runs (has `require`, `ipcRenderer`)
2. **Main World** — where web page content runs (your React app)

`contextBridge.exposeInMainWorld()` safely copies values between these worlds, preventing direct object references that could leak the isolated context:

```javascript
// preload.cjs (runs in isolated world)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // These functions are COPIED into the main world
  // The main world cannot reach back into the isolated world
  safeStorage: {
    encrypt: (plaintext) => ipcRenderer.invoke('safe-storage-encrypt', plaintext)
  }
});
```

## Configuration

Context isolation is enabled by default in modern Electron. You should **never** disable it:

```javascript
new BrowserWindow({
  webPreferences: {
    contextIsolation: true,    // Default: true (keep it!)
    nodeIntegration: false,    // Default: false (keep it!)
    preload: path.join(__dirname, 'preload.cjs')
  }
});
```

## What Gets Serialized

`contextBridge` can only transfer **structured-cloneable** values between worlds:
- ✅ Primitives (strings, numbers, booleans)
- ✅ Plain objects and arrays
- ✅ Functions (wrapped as proxies)
- ✅ Promises
- ❌ Classes/prototypes (stripped to plain objects)
- ❌ DOM elements
- ❌ Symbols

## Key Links

- [Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [contextBridge API](https://www.electronjs.org/docs/latest/api/context-bridge)
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)

## Key Takeaways

- Context isolation prevents **prototype pollution attacks** from web content
- Preload and renderer run in **separate JavaScript worlds**
- `contextBridge` safely copies data between worlds via structured cloning
- **Never disable** context isolation — it's a critical security boundary
- Functions exposed via contextBridge become proxies, not direct references

## DJ.ai Connection

DJ.ai enables context isolation on all windows in `electron-app/electron/main.cjs` — the main app window, the YouTube Music window, and OAuth popups all have `contextIsolation: true`. This is especially important because the YouTube Music window loads third-party content from `music.youtube.com`, and OAuth windows load content from Google, Spotify, and Apple identity servers. Context isolation ensures these external pages cannot tamper with DJ.ai's preload bridge, keeping IPC channels secure even when rendering untrusted content.
