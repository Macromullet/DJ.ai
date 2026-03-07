# The Main Process

## What Is the Main Process?

Every Electron app has exactly one main process. It's a Node.js runtime that serves as the application's entry point and coordinator. The main process has full access to Node.js APIs and Electron's main-process modules — it can read/write files, spawn child processes, access the network, and interact with the operating system.

The main process is responsible for:
- **Creating and managing windows** (`BrowserWindow`)
- **Handling application lifecycle** (`app.on('ready')`, `app.on('quit')`)
- **Registering IPC handlers** for renderer communication
- **Accessing native APIs** (system tray, global shortcuts, notifications)
- **Managing security** (CSP headers, window open handlers)

## Core Concepts

### BrowserWindow

The `BrowserWindow` class creates and controls browser windows. Each window runs its own renderer process:

```javascript
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  backgroundColor: '#1a1a1a',
  webPreferences: {
    nodeIntegration: false,      // Security: no Node.js in renderer
    contextIsolation: true,      // Security: isolated JS contexts
    preload: path.join(__dirname, 'preload.cjs')
  }
});
```

### App Lifecycle

The `app` module controls the application lifecycle:

```javascript
app.on('ready', () => {
  createMainWindow();
  createTray();
  registerMediaKeys();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS: re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
});
```

### IPC Handler Registration

The main process registers handlers that renderer processes can invoke:

```javascript
ipcMain.handle('safe-storage-encrypt', (event, plaintext) => {
  return safeStorage.encryptString(plaintext).toString('base64');
});
```

## Key Links

- [The Main Process](https://www.electronjs.org/docs/latest/tutorial/process-model#the-main-process)
- [BrowserWindow API](https://www.electronjs.org/docs/latest/api/browser-window)
- [app Module](https://www.electronjs.org/docs/latest/api/app)

## Key Takeaways

- The main process is the **single coordinator** for the entire application
- It has **full Node.js and OS access** — this is where privileged operations happen
- Every `BrowserWindow` spawns a **separate renderer process**
- Security settings (`nodeIntegration`, `contextIsolation`) are configured per-window

## DJ.ai Connection

DJ.ai's main process (`electron-app/electron/main.cjs`) manages window creation and IPC. The primary window loads the React app at `localhost:5173` during development. OAuth popup windows open for provider authentication. The main process also registers 15+ IPC handlers for AI requests, safe storage, playback control, notifications, and tray updates — making it the central nervous system of the application.
