# IPC: send / on Pattern

## What Is send/on?

The `ipcRenderer.send()` / `ipcMain.on()` pattern is a **one-way, fire-and-forget** messaging approach. The sender dispatches a message and continues immediately — there's no response. This pattern also works in the opposite direction: the main process can push messages to renderers using `webContents.send()`.

## When to Use send/on

Use this pattern when:
- You **don't need a response** (UI notifications, logging)
- The **main process pushes events** to the renderer (tray clicks, media keys)
- You want **event-driven** rather than request-response communication

## Main → Renderer (Push Events)

The main process sends events to a specific window's renderer using `webContents.send()`:

```javascript
// main.cjs — System tray click handler
const contextMenu = Menu.buildFromTemplate([
  {
    label: '⏸ Pause',
    click: () => mainWindow?.webContents.send('tray-playback-toggle')
  },
  {
    label: '⏭ Next',
    click: () => mainWindow?.webContents.send('tray-next-track')
  },
  {
    label: '⏮ Previous',
    click: () => mainWindow?.webContents.send('tray-previous-track')
  }
]);
```

### Preload — Expose Event Listeners

```javascript
// preload.cjs
tray: {
  onPlaybackToggle: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-playback-toggle', handler);
    // Return cleanup function for React useEffect
    return () => ipcRenderer.removeListener('tray-playback-toggle', handler);
  },
  onNextTrack: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tray-next-track', handler);
    return () => ipcRenderer.removeListener('tray-next-track', handler);
  }
}
```

### Renderer — Subscribe in React

```typescript
useEffect(() => {
  const cleanup = window.electron.tray.onPlaybackToggle(() => {
    togglePlayback();  // React state update
  });
  return cleanup;  // Unsubscribe on unmount
}, []);
```

## Important: Memory Leak Prevention

Always return cleanup functions and call them in React's `useEffect` return. Without cleanup, event listeners accumulate as components mount/unmount:

```javascript
// ✅ Correct: cleanup on unmount
onCallback: (callback) => {
  const handler = (_event, url) => callback(url);
  ipcRenderer.on('oauth-deep-link', handler);
  return () => ipcRenderer.removeListener('oauth-deep-link', handler);
}
```

## Key Links

- [Renderer to Main (one-way)](https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-1-renderer-to-main-one-way)
- [Main to Renderer](https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-3-main-to-renderer)
- [ipcRenderer.on](https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendereronchannel-listener)

## Key Takeaways

- `send`/`on` is for **one-way messages** without responses
- Main→Renderer uses `webContents.send()`, not `ipcMain.send()`
- Always **return cleanup functions** from event listener registration
- This pattern is ideal for **push notifications** and **event broadcasting**

## DJ.ai Connection

DJ.ai uses the `send`/`on` pattern primarily for system tray and media key events. When a user clicks "Play" in the system tray or presses the MediaPlayPause key, `main.cjs` sends `tray-playback-toggle` to the renderer. The React app subscribes via `window.electron.tray.onPlaybackToggle()`. The same pattern handles `oauth-deep-link` events — when the user completes OAuth login, the main process pushes the callback URL to the renderer, which processes the authorization code.
