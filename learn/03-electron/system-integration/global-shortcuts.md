# Global Shortcuts: Media Key Handling

## What Are Global Shortcuts?

Global shortcuts are keyboard combinations that work **even when your app is not focused**. The most important use case for media players is capturing hardware media keys — the Play/Pause, Next Track, and Previous Track buttons found on most keyboards.

Electron's `globalShortcut` module registers these system-wide shortcuts.

## Registering Media Keys

```javascript
const { globalShortcut } = require('electron');

function registerMediaKeys() {
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('tray-playback-toggle');
  });

  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('tray-next-track');
  });

  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('tray-previous-track');
  });
}
```

Each media key press sends an IPC message to the renderer, which handles the actual playback control.

## Lifecycle Management

Global shortcuts must be registered **after** the app is ready and **unregistered** when the app quits:

```javascript
app.on('ready', () => {
  createMainWindow();
  registerMediaKeys();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
```

Failing to unregister shortcuts can leave system-wide key bindings active after your app closes, interfering with other applications.

## Checking Registration

You can verify a shortcut was successfully registered:

```javascript
const registered = globalShortcut.register('MediaPlayPause', callback);
if (!registered) {
  console.warn('MediaPlayPause registration failed — another app may own it');
}

// Or check afterwards
console.log(globalShortcut.isRegistered('MediaPlayPause'));  // true/false
```

## Platform Considerations

| Platform | Media Key Support | Notes |
|----------|------------------|-------|
| Windows | ✅ Excellent | Works with most keyboards |
| macOS | ✅ Good | May conflict with iTunes/Music.app |
| Linux | ⚠️ Varies | Depends on desktop environment, X11/Wayland |

On macOS, the system media player (Music.app) may compete for media key events. Some users need to quit Music.app for other apps to receive media keys.

## Key Links

- [globalShortcut API](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [Accelerator Key Codes](https://www.electronjs.org/docs/latest/api/accelerator)

## Key Takeaways

- Global shortcuts work **app-wide**, even when the window is unfocused
- Always **unregister** shortcuts on app quit to avoid zombie key bindings
- Media keys (`MediaPlayPause`, `MediaNextTrack`, `MediaPreviousTrack`) are the standard accelerator names
- Only **one app** can own a global shortcut at a time — registration may fail

## DJ.ai Connection

DJ.ai registers three media key shortcuts in `electron-app/electron/main.cjs`: `MediaPlayPause`, `MediaNextTrack`, and `MediaPreviousTrack`. Each forwards to the React renderer via `webContents.send()`, using the same IPC channels as the system tray controls (`tray-playback-toggle`, `tray-next-track`, `tray-previous-track`). This means media keys and system tray controls share the same code path in the React app, keeping the logic DRY. Shortcuts are registered at app startup and unregistered on quit.
