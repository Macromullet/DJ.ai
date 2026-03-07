# IPC: invoke / handle Pattern

## What Is invoke/handle?

The `ipcRenderer.invoke()` / `ipcMain.handle()` pattern is Electron's recommended approach for **asynchronous request-response** communication. The renderer sends a request and receives a Promise that resolves with the main process's response — or rejects if an error occurs.

This pattern replaced the older `send`/`sendSync` approach for most use cases because it provides cleaner error handling and naturally async behavior.

## How It Works

```
┌─────────────┐   invoke('channel', args)   ┌──────────────┐
│  Renderer    │ ────────────────────────►   │ Main Process │
│  (React)     │                             │              │
│              │   ◄──── Promise resolves ── │  handle()    │
└─────────────┘        (or rejects)          └──────────────┘
```

### Main Process — Register a Handler

```javascript
// main.cjs
const { ipcMain, safeStorage } = require('electron');

ipcMain.handle('safe-storage-encrypt', async (event, plaintext) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available');
  }
  return safeStorage.encryptString(plaintext).toString('base64');
});
```

### Preload — Expose to Renderer

```javascript
// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  safeStorage: {
    encrypt: (plaintext) => ipcRenderer.invoke('safe-storage-encrypt', plaintext)
  }
});
```

### Renderer — Call the Method

```typescript
// React component
const encrypted = await window.electron.safeStorage.encrypt(myApiKey);
```

## Error Handling

Errors thrown in `handle()` callbacks automatically propagate to the renderer's Promise:

```javascript
// Main process
ipcMain.handle('safe-storage-decrypt', (event, encrypted) => {
  if (decryptCallTimestamps.length >= 10) {
    throw new Error('Rate limit exceeded — max 10 calls per minute');
  }
  // ...
});

// Renderer
try {
  const decrypted = await window.electron.safeStorage.decrypt(data);
} catch (error) {
  console.error('Decryption failed:', error.message);
}
```

## Key Links

- [Renderer to Main (two-way)](https://www.electronjs.org/docs/latest/tutorial/ipc#pattern-2-renderer-to-main-two-way)
- [ipcMain.handle](https://www.electronjs.org/docs/latest/api/ipc-main#ipcmainhandlechannel-listener)
- [ipcRenderer.invoke](https://www.electronjs.org/docs/latest/api/ipc-renderer#ipcrendererinvokechannel-args)

## Key Takeaways

- `invoke`/`handle` is the **default pattern** for renderer-to-main communication
- Returns a **Promise** — use `async`/`await` naturally
- Errors **propagate** from main to renderer through the Promise rejection
- One handler per channel — calling `handle()` twice on the same channel throws

## DJ.ai Connection

DJ.ai registers 12+ `handle` channels in `electron-app/electron/main.cjs`. The most critical ones are:
- **`ai-api-request`** — proxies AI API calls to bypass CORS restrictions, with host allowlisting for security
- **`ai-tts-request`** — fetches binary TTS audio, returns base64-encoded data
- **`safe-storage-encrypt/decrypt`** — OS-level encryption for API keys, with rate limiting on decrypt
- **`open-oauth-window`** — creates validated OAuth popup windows with provider-specific settings
- **`yt-music-play-url`** / **`yt-music-control`** / **`yt-music-get-track`** — playback control for the hidden YouTube Music window

Each channel is exposed through `window.electron.*` in the preload script, giving React components a clean async API.
