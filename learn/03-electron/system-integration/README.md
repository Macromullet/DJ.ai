# System Integration: Native OS Features

## Overview

One of Electron's biggest advantages over web apps is access to native OS features. While a browser tab is confined to its sandbox, an Electron app can integrate deeply with the operating system — adding system tray icons, responding to media keys, showing native notifications, and registering custom URL protocols.

These integrations make desktop apps feel **native** rather than like a website in a frame.

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [System Tray](./system-tray.md) | Tray icon with playback controls |
| [Notifications](./notifications.md) | OS-native desktop notifications |
| [Global Shortcuts](./global-shortcuts.md) | Media key handling |
| [Deep Links](./deep-links.md) | Custom protocol (djai://) registration |

## Why System Integration Matters

For a music player like DJ.ai, system integration is essential to the user experience:

- **System tray** — users can control playback without switching windows
- **Media keys** — hardware play/pause/skip buttons work across all platforms
- **Notifications** — track changes and DJ commentary appear even when minimized
- **Deep links** — OAuth callback URLs route directly to the app

Without these, the app would feel like a web page rather than a first-class desktop application.

## Platform Considerations

| Feature | Windows | macOS | Linux |
|---------|---------|-------|-------|
| System Tray | ✅ | ✅ (menu bar) | ✅ (varies) |
| Notifications | ✅ (Action Center) | ✅ (Notification Center) | ✅ (libnotify) |
| Media Keys | ✅ | ✅ | ✅ (with caveats) |
| Deep Links | ✅ (registry) | ✅ (Info.plist) | ✅ (.desktop file) |

Electron abstracts most platform differences, but testing on all three platforms is important — especially for notifications and tray behavior.

## Key Links

- [Electron API: Tray](https://www.electronjs.org/docs/latest/api/tray)
- [Electron API: Notification](https://www.electronjs.org/docs/latest/api/notification)
- [Electron API: globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut)

## DJ.ai Connection

DJ.ai leverages all four system integration features in `electron-app/electron/main.cjs`. The system tray shows the current track and provides Play/Pause, Next, and Previous controls. Global shortcuts capture MediaPlayPause, MediaNextTrack, and MediaPreviousTrack keys. Desktop notifications announce track changes and DJ commentary. The `djai://` protocol handles OAuth callbacks when the user authenticates with music providers, routing the authorization code directly to the app from the system browser.
