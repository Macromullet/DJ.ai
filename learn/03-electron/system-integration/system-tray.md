# System Tray

## What Is the System Tray?

The system tray (Windows) or menu bar (macOS) is the notification area where apps place persistent icons. Users expect media players to live here — minimizing to the tray and providing quick playback controls without opening the full window.

Electron's `Tray` class creates and manages tray icons with context menus and click handlers.

## Creating a Tray Icon

```javascript
const { Tray, Menu, nativeImage } = require('electron');

function createTray() {
  // Create tray with icon
  tray = new Tray(nativeImage.createFromDataURL(/* base64 icon */));
  tray.setToolTip('DJ.ai');

  // Build context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: `${currentTrackInfo.title} - ${currentTrackInfo.artist}`,
      enabled: false  // Display only, not clickable
    },
    { type: 'separator' },
    {
      label: isPlaying ? '⏸ Pause' : '▶ Play',
      click: () => mainWindow?.webContents.send('tray-playback-toggle')
    },
    {
      label: '⏭ Next',
      click: () => mainWindow?.webContents.send('tray-next-track')
    },
    {
      label: '⏮ Previous',
      click: () => mainWindow?.webContents.send('tray-previous-track')
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => { mainWindow?.show(); mainWindow?.focus(); }
    },
    { type: 'separator' },
    {
      label: 'Quit DJ.ai',
      click: () => { app.isQuitting = true; app.quit(); }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}
```

## Dynamic Menu Updates

The tray menu needs to update when the track changes or play state toggles. DJ.ai handles this via an IPC channel:

```javascript
ipcMain.handle('update-tray-info', (event, info) => {
  currentTrackInfo = info;
  isPlaying = info.isPlaying;
  // Rebuild the context menu with updated info
  createTray();  // Recreate with new state
});
```

The React app calls `window.electron.tray.updateInfo()` whenever the playback state changes.

## Platform Differences

- **Windows**: Right-click shows context menu, left-click can show menu or custom behavior
- **macOS**: Click shows menu (menu bar apps), typically smaller icon (16x16 @2x)
- **Linux**: Behavior varies by desktop environment (GNOME, KDE, etc.)

## Key Links

- [Tray API](https://www.electronjs.org/docs/latest/api/tray)
- [Menu API](https://www.electronjs.org/docs/latest/api/menu)
- [nativeImage API](https://www.electronjs.org/docs/latest/api/native-image)

## Key Takeaways

- Use `Menu.buildFromTemplate()` for declarative context menus
- **Rebuild the menu** when state changes (Electron menus are immutable after creation)
- Tray click handlers bridge to the main window via `webContents.send()`
- Test on all platforms — tray behavior differs significantly

## DJ.ai Connection

DJ.ai's system tray in `electron-app/electron/main.cjs` displays the current track title and artist as a disabled menu item, followed by Play/Pause, Next, Previous controls. Each control sends an IPC message to the main React app via `webContents.send()`. The tray menu is rebuilt whenever the renderer calls `window.electron.tray.updateInfo()` with new track data. Double-clicking the tray icon restores and focuses the main window.
