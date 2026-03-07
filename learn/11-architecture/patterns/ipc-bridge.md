# IPC Bridge (Inter-Process Communication)

## The Concept

Electron apps run in **two separate processes**:

- **Main process** — Node.js, full OS access (file system, tray, notifications, media keys)
- **Renderer process** — Chromium, runs React/web code (sandboxed, no OS access)

These processes cannot share memory or call each other's functions directly. **IPC (Inter-Process Communication)** is the mechanism for sending messages between them. The **preload script** acts as a secure bridge — exposing only specific, typed channels from main to renderer.

### Security Model

```
Renderer (React)  ←→  Preload Bridge  ←→  Main (Node.js)
   Sandboxed           Controlled API       Full OS access
   No Node.js          window.electron      File system, tray
   No OS access        Typed channels       Media keys, etc.
```

Without a preload bridge, the renderer would need full Node.js access — a massive security risk (any XSS vulnerability could access the file system).

## How DJ.ai Implements IPC

### The Preload Script

`electron-app/preload.cjs` exposes a controlled API via `contextBridge`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Send messages to main process
  send: (channel, data) => {
    const validChannels = ['oauth-open', 'tray-update', 'media-key'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  // Receive messages from main process
  on: (channel, callback) => {
    const validChannels = ['oauth-callback', 'media-key-pressed'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Request-response pattern
  invoke: (channel, data) => {
    return ipcRenderer.invoke(channel, data);
  }
});
```

### Usage in React Components

```typescript
// In a React component (renderer process)
declare global {
  interface Window {
    electron: {
      send: (channel: string, data?: any) => void;
      on: (channel: string, callback: (...args: any[]) => void) => void;
      invoke: (channel: string, data?: any) => Promise<any>;
    };
  }
}

// Open OAuth URL in system browser
window.electron.send('oauth-open', authUrl);

// Listen for media key events
window.electron.on('media-key-pressed', (key) => {
  if (key === 'play-pause') togglePlayback();
});
```

### Three IPC Patterns

| Pattern | Direction | Use Case |
|---------|-----------|----------|
| `send` | Renderer → Main | Fire-and-forget (open URL, update tray) |
| `on` | Main → Renderer | Notifications (media keys, deep links) |
| `invoke` | Renderer ↔ Main | Request-response (get system info) |

## DJ.ai Connection

DJ.ai's `preload.cjs` exposes `window.electron` with typed channels for OAuth flows (opening auth URLs, receiving callbacks), media key handling (play/pause/next/previous from keyboard), and tray menu integration. The channel whitelist pattern ensures only known, safe operations are exposed — the renderer can never execute arbitrary Node.js code.

## Key Takeaways

- IPC is the only safe way to communicate between Electron's two processes
- The preload script acts as a security boundary — whitelist channels explicitly
- Never expose `ipcRenderer` directly to the renderer process
- Three patterns cover most needs: fire-and-forget, notification, request-response

## Further Reading

- [Electron: Inter-Process Communication](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron: Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron: Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
