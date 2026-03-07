# Window Open Handler

## What Is setWindowOpenHandler?

When web content calls `window.open()` or a link has `target="_blank"`, Electron would normally create a new `BrowserWindow`. The `setWindowOpenHandler` API intercepts these attempts, letting you **allow, deny, or redirect** them.

This is critical for security: without it, a compromised page could open arbitrary URLs in new Electron windows that might have different security settings.

## How It Works

```javascript
// main.cjs
mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (isAllowedExternalProtocol(url)) {
    // Open in the user's default browser instead
    shell.openExternal(url);
  } else {
    console.warn(`Blocked openExternal for disallowed protocol: ${url}`);
  }
  // Always deny creating new Electron windows
  return { action: 'deny' };
});
```

The handler receives the target URL and returns `{ action: 'deny' }` or `{ action: 'allow' }`. By defaulting to `deny` and only allowing known-safe URLs to open in the system browser, DJ.ai prevents:

- **Phishing popups** — malicious content can't open fake login windows
- **Window proliferation** — scripts can't spawn unlimited windows
- **Protocol exploitation** — only `https://` and specific protocols are allowed

## URL Validation

The `isAllowedExternalProtocol` function checks the URL's protocol before passing it to `shell.openExternal()`:

```javascript
function isAllowedExternalProtocol(url) {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

This prevents `file://`, `javascript:`, and other dangerous protocols from being opened externally.

## Controlling OAuth Windows

Instead of letting `window.open()` create OAuth popups, DJ.ai uses a dedicated IPC channel:

```javascript
ipcMain.handle('open-oauth-window', async (event, options) => {
  // Validate the OAuth URL before creating a window
  const oauthWindow = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    title: 'Sign In - DJ.ai'
  });

  oauthWindow.loadURL(options.url);
});
```

This gives the main process full control over which URLs get loaded in new windows.

## Key Links

- [setWindowOpenHandler API](https://www.electronjs.org/docs/latest/api/web-contents#contentssetwindowopenhandlerhandler)
- [shell.openExternal](https://www.electronjs.org/docs/latest/api/shell#shellopenexternalurl-options)
- [Security: Disable window.open](https://www.electronjs.org/docs/latest/tutorial/security#13-disable-or-limit-creation-of-new-windows)

## Key Takeaways

- Always set a **window open handler** — don't let renderers create windows freely
- Default to **`{ action: 'deny' }`** and explicitly allow only safe URLs
- **Validate protocols** before passing URLs to `shell.openExternal()`
- Create controlled windows (like OAuth popups) via **IPC handlers** instead

## DJ.ai Connection

DJ.ai's `setWindowOpenHandler` in `electron-app/electron/main.cjs` denies all `window.open()` attempts from the main renderer and instead redirects allowed URLs to the system browser via `shell.openExternal()`. OAuth login windows are created through the dedicated `open-oauth-window` IPC channel, which validates the URL, creates a properly secured `BrowserWindow`, and monitors it for callback URLs. This ensures all window creation is controlled by the main process, not by web content.
