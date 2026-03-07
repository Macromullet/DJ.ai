# Deep Links: Custom Protocol Registration

## What Are Deep Links?

Deep links allow external applications (browsers, other apps) to open your Electron app by clicking a URL with a custom protocol. Instead of `https://`, your app registers a protocol like `djai://` — and the OS routes matching URLs to your application.

This is essential for **OAuth flows**: after the user logs in via a browser popup, the identity provider redirects to your custom protocol URL, which brings the user back to your app with the authorization code.

## Registering a Custom Protocol

```javascript
const { app } = require('electron');

// Register djai:// protocol
if (process.defaultApp) {
  // Running in development (electron .)
  app.setAsDefaultProtocolClient('djai', process.execPath, [
    path.resolve(process.argv[1])
  ]);
} else {
  // Running as packaged app
  app.setAsDefaultProtocolClient('djai');
}
```

The `process.defaultApp` check handles the difference between development (where Electron is the executable and your script is an argument) and production (where your app is the executable).

## Single Instance Lock

Only one instance of your app should handle deep links. The single instance lock ensures subsequent launches forward URLs to the existing instance:

```javascript
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();  // Another instance is already running
} else {
  app.on('second-instance', (event, commandLine) => {
    // Find the deep link URL in command line arguments
    const url = commandLine.find(arg => arg.startsWith('djai://'));
    if (url) handleDeepLink(url);

    // Restore and focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

## Handling the Deep Link

```javascript
function handleDeepLink(url) {
  // Only process OAuth callback URLs
  if (mainWindow && isDjaiOAuthCallback(url)) {
    // Convert custom protocol to HTTP for parsing
    const callbackUrl = url.replace('djai://', 'http://localhost/');
    mainWindow.webContents.send('oauth-deep-link', callbackUrl);

    // Close the OAuth window if still open
    if (oauthWindow) {
      oauthWindow.close();
      oauthWindow = null;
    }
  }
}
```

### macOS Handling

macOS uses a different event for deep links:

```javascript
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});
```

## Key Links

- [Launch App from URL](https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app)
- [setAsDefaultProtocolClient](https://www.electronjs.org/docs/latest/api/app#appsetasdefaultprotocolclientprotocol-path-args)
- [requestSingleInstanceLock](https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelock)

## Key Takeaways

- Register custom protocols with `app.setAsDefaultProtocolClient()`
- Use `requestSingleInstanceLock()` to handle multiple launch attempts
- macOS uses `open-url` event; Windows/Linux use `second-instance` with command line args
- Always validate deep link URLs before processing them

## DJ.ai Connection

DJ.ai registers the `djai://` protocol in `electron-app/electron/main.cjs` for OAuth redirect handling. When a user authenticates with YouTube, Spotify, or Apple Music, the OAuth provider redirects to `djai://oauth/callback?code=...&state=...`. The OS routes this to DJ.ai's main process, which extracts the authorization code and sends it to the React renderer via the `oauth-deep-link` IPC channel. The single instance lock ensures the existing app instance handles the callback. The OAuth popup window is automatically closed after the callback is received.
