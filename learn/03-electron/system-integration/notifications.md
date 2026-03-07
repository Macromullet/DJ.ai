# Desktop Notifications

## What Are Electron Notifications?

Electron's `Notification` API creates OS-native notifications — the popup alerts that appear in Windows Action Center, macOS Notification Center, or Linux's notification daemon. Unlike web notifications (which require browser permission), Electron notifications work out of the box in packaged apps.

## Using the Notification API

Notifications are created in the **main process**:

```javascript
const { Notification } = require('electron');

function showNotification(title, body, icon) {
  const notification = new Notification({
    title: title,
    body: body,
    icon: icon,        // Optional: app icon or album art
    silent: false,     // Play notification sound
    urgency: 'normal'  // Linux: low, normal, critical
  });

  notification.show();

  notification.on('click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}
```

DJ.ai exposes this through an IPC handler:

```javascript
// main.cjs
ipcMain.handle('show-notification', (event, options) => {
  const notification = new Notification({
    title: options.title || 'DJ.ai',
    body: options.body,
    icon: options.icon
  });
  notification.show();
});
```

The renderer calls it through the preload bridge:

```typescript
// React component
await window.electron.notifications.show({
  title: 'Now Playing',
  body: `${track.title} — ${track.artist}`,
  icon: track.thumbnailUrl
});
```

## Notification Patterns for Music Players

| Event | Notification Content |
|-------|---------------------|
| Track change | Song title, artist, album art |
| DJ commentary | AI-generated comment text |
| Provider connected | "Connected to YouTube Music" |
| Error | "Playback failed — check connection" |

## Platform Behavior

- **Windows**: Notifications appear in Action Center, persist until dismissed
- **macOS**: Notifications appear in Notification Center, can have action buttons
- **Linux**: Behavior depends on desktop environment and notification daemon
- **Focus**: On all platforms, clicking a notification can bring the app to front

## Key Links

- [Notification API](https://www.electronjs.org/docs/latest/api/notification)
- [Notifications Tutorial](https://www.electronjs.org/docs/latest/tutorial/notifications)

## Key Takeaways

- Notifications are created in the **main process**, not the renderer
- Use IPC to trigger notifications from React components
- Include **album art** or app icon for visual context
- Handle the **`click` event** to bring the app to the foreground
- Don't over-notify — users will disable them

## DJ.ai Connection

DJ.ai sends desktop notifications through the `show-notification` IPC channel defined in `electron-app/electron/main.cjs`. The React app triggers notifications for track changes (showing song title, artist, and thumbnail) and AI DJ commentary. The preload script exposes `window.electron.notifications.show()` for the renderer to use. This keeps users informed about what's playing even when DJ.ai is minimized to the system tray — a standard feature that users expect from desktop music players.
