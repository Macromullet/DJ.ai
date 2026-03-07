const { app, BrowserWindow, ipcMain, shell, safeStorage, Notification, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { isAllowedAIHost, isValidRedirectUri, isAllowedOAuthHost, isTTSResponseWithinLimit, isValidPlaybackAction, buildCSP, isOAuthCallback, isDjaiOAuthCallback, isAllowedExternalProtocol } = require('./validation.cjs');
const { spawn } = require('child_process');

let mainWindow = null;
let oauthWindow = null;
let tray = null;
let currentTrackInfo = { title: 'DJ.ai', artist: '' };

// ============ MAIN-PROCESS API KEY STORE ============
// Keys are stored encrypted on disk, decrypted only in main process memory.
// The renderer NEVER receives plaintext keys.

const API_KEYS_FILE = 'api-keys.enc';
let apiKeyStore = { openaiApiKey: '', anthropicApiKey: '', elevenLabsApiKey: '', geminiApiKey: '' };

function getApiKeysPath() {
  return path.join(app.getPath('userData'), API_KEYS_FILE);
}

function loadApiKeys() {
  try {
    const filePath = getApiKeysPath();
    if (!fs.existsSync(filePath)) return;
    const encryptedBase64 = fs.readFileSync(filePath, 'utf-8');
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('safeStorage unavailable — cannot load API keys');
      return;
    }
    const buffer = Buffer.from(encryptedBase64, 'base64');
    const json = safeStorage.decryptString(buffer);
    apiKeyStore = { ...apiKeyStore, ...JSON.parse(json) };
    console.log('API keys loaded from encrypted storage');
  } catch (err) {
    console.error('Failed to load API keys:', err.message);
  }
}

function persistApiKeys() {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage unavailable');
    }
    const json = JSON.stringify(apiKeyStore);
    const encrypted = safeStorage.encryptString(json);
    fs.writeFileSync(getApiKeysPath(), encrypted.toString('base64'), 'utf-8');
  } catch (err) {
    console.error('Failed to persist API keys:', err.message);
  }
}

/** Inject the correct auth header for a given AI API host */
function injectAuthHeaders(url, headers) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const injected = { ...headers };

    if (host === 'api.openai.com' && apiKeyStore.openaiApiKey) {
      injected['Authorization'] = `Bearer ${apiKeyStore.openaiApiKey}`;
    } else if (host === 'api.anthropic.com' && apiKeyStore.anthropicApiKey) {
      injected['x-api-key'] = apiKeyStore.anthropicApiKey;
    } else if (host === 'api.elevenlabs.io' && apiKeyStore.elevenLabsApiKey) {
      injected['xi-api-key'] = apiKeyStore.elevenLabsApiKey;
    } else if (host === 'generativelanguage.googleapis.com' && apiKeyStore.geminiApiKey) {
      injected['x-goog-api-key'] = apiKeyStore.geminiApiKey;
    }

    return injected;
  } catch {
    return headers;
  }
}

const isDev = !app.isPackaged;

// Register custom protocol for OAuth callbacks in packaged app
if (process.defaultApp) {
  app.setAsDefaultProtocolClient('djai', process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient('djai');
}

// Handle deep link on Windows/Linux (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Windows: protocol URL is in commandLine
    const url = commandLine.find(arg => arg.startsWith('djai://'));
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url) {
  // Parse djai://oauth/callback?code=XXX&state=YYY using proper URL parsing
  if (mainWindow && isDjaiOAuthCallback(url)) {
    // Forward to the renderer's React Router
    const callbackUrl = url.replace('djai://', 'http://localhost/');
    mainWindow.webContents.send('oauth-deep-link', callbackUrl);
    
    // Close OAuth window if open
    if (oauthWindow) {
      oauthWindow.close();
      oauthWindow = null;
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    title: 'DJ.ai - Your AI Music Experience',
    autoHideMenuBar: false,
  });

  // In development, load from Vite dev server
  if (isDev) {
    const vitePort = process.env.VITE_PORT || 5173;
    mainWindow.loadURL(`http://localhost:${vitePort}`);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalProtocol(url)) {
      shell.openExternal(url);
    } else {
      console.warn(`Blocked openExternal for disallowed protocol: ${url}`);
    }
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// System tray
function createTray() {
  const trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAsElEQVQ4T2NkoBAwUqifgXoGzPr/n+E/AwMDIyMjw6z//xn+MzAwgORhAGQIyBCgAQwMIENAbpj1H8kFIANBBsAMQjYA5AKQNwlyAUwDbhrIAJC3sLkA5myQC0AugenBFgYgA2DeQnYB0VEIMwhkCMgQZG8Ra8CsWf8Z/jP8Bwcj0bEASwxQzVlAR2INA5ALUQ2c9Z+R4T8jOg2ZTQJ5CxYLoKAAimQYAAA5sVYEUDIVigAAAABJRU5ErkJggg==');
  tray = new Tray(trayIcon);
  tray.setToolTip('DJ.ai');
  updateTrayMenu();

  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

function updateTrayMenu(isPlaying = false) {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: currentTrackInfo.title + (currentTrackInfo.artist ? ' - ' + currentTrackInfo.artist : ''),
      enabled: false
    },
    { type: 'separator' },
    {
      label: isPlaying ? '⏸ Pause' : '▶ Play',
      click: () => mainWindow?.webContents.send('tray-playback-toggle')
    },
    { label: '⏭ Next', click: () => mainWindow?.webContents.send('tray-next-track') },
    { label: '⏮ Previous', click: () => mainWindow?.webContents.send('tray-previous-track') },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => { mainWindow?.show(); mainWindow?.focus(); }
    },
    { type: 'separator' },
    { label: 'Quit DJ.ai', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
}

// Tray track info updates
ipcMain.handle('update-tray-info', async (_event, { title, artist, isPlaying }) => {
  currentTrackInfo = { title: title || 'DJ.ai', artist: artist || '' };
  if (tray) {
    tray.setToolTip(`${currentTrackInfo.title}${currentTrackInfo.artist ? ' - ' + currentTrackInfo.artist : ''}`);
    updateTrayMenu(isPlaying);
  }
  return true;
});

// Media key support
function registerMediaKeys() {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      mainWindow?.webContents.send('tray-playback-toggle');
    });
    globalShortcut.register('MediaNextTrack', () => {
      mainWindow?.webContents.send('tray-next-track');
    });
    globalShortcut.register('MediaPreviousTrack', () => {
      mainWindow?.webContents.send('tray-previous-track');
    });
  } catch (e) {
    console.warn('Failed to register media keys:', e.message);
  }
}

// Playback action validation uses isValidPlaybackAction from validation.cjs

// OAuth Window Handler
ipcMain.handle('open-oauth-window', async (event, { url, redirectUri }) => {
  if (oauthWindow) {
    oauthWindow.focus();
    return;
  }

  // Validate redirectUri — must be a non-empty expected callback URL
  if (!isValidRedirectUri(redirectUri)) {
    console.error('open-oauth-window blocked: invalid redirectUri', redirectUri);
    return { error: 'Invalid redirect URI' };
  }

  // Validate the OAuth URL before creating window
  try {
    const parsed = new URL(url);
    if (!isAllowedOAuthHost(url)) {
      console.error(`open-oauth-window blocked: ${parsed.hostname} is not an allowed OAuth host or protocol is not HTTPS`);
      return { error: 'OAuth host not in allowlist' };
    }
  } catch (e) {
    console.error('open-oauth-window blocked: invalid URL', url);
    return { error: 'Invalid OAuth URL' };
  }

  oauthWindow = new BrowserWindow({
    width: 600,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: 'Sign In - DJ.ai',
    autoHideMenuBar: true
  });

  oauthWindow.loadURL(url);

  oauthWindow.webContents.on('will-redirect', (_event, url) => {
    if (url && isOAuthCallback(url, redirectUri)) {
      _event.preventDefault();
      if (mainWindow) {
        mainWindow.webContents.send('oauth-deep-link', url);
      }
      oauthWindow.close();
    }
  });

  oauthWindow.webContents.on('will-navigate', (_event, url) => {
    if (url && isOAuthCallback(url, redirectUri)) {
      _event.preventDefault();
      if (mainWindow) {
        mainWindow.webContents.send('oauth-deep-link', url);
      }
      oauthWindow.close();
    }
  });

  oauthWindow.on('closed', () => {
    oauthWindow = null;
  });
});

// AI API proxy — routes requests through the main process to bypass CORS
// Allowlist is defined in validation.cjs (AI_API_ALLOWLIST)

ipcMain.handle('ai-api-request', async (event, { url, method, headers, body }) => {
  try {
    if (!isAllowedAIHost(url)) {
      console.error(`ai-api-request blocked: ${url} is not in the allowlist or not HTTPS`);
      return {
        ok: false,
        status: 403,
        statusText: 'Forbidden: domain not in allowlist',
        body: null,
      };
    }

    const parsed = new URL(url);

    // Main process injects auth headers — renderer never sends real keys
    const injectedHeaders = injectAuthHeaders(url, headers || {});

    const response = await fetch(parsed.href, {
      method: method || 'POST',
      headers: injectedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseBody = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: error.message,
      body: null,
    };
  }
});

// IPC handler for TTS audio requests (returns base64-encoded binary audio)
ipcMain.handle('ai-tts-request', async (event, { url, method, headers, body }) => {
  try {
    if (!isAllowedAIHost(url)) {
      return { ok: false, status: 403, statusText: 'Forbidden: domain not in allowlist', body: null };
    }

    const parsed = new URL(url);
    // Main process injects auth headers — renderer never sends real keys
    const injectedHeaders = injectAuthHeaders(url, headers || {});
    const response = await fetch(parsed.href, {
      method: method || 'POST',
      headers: injectedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, statusText: response.statusText, body: errorText };
    }

    // Return binary audio as base64 (with size limit to prevent OOM)
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    if (!isTTSResponseWithinLimit(contentLength)) {
      return { ok: false, status: 413, statusText: 'TTS response too large', body: null };
    }
    const buffer = await response.arrayBuffer();
    if (!isTTSResponseWithinLimit(buffer.byteLength)) {
      return { ok: false, status: 413, statusText: 'TTS response too large', body: null };
    }
    const base64 = Buffer.from(buffer).toString('base64');
    return { ok: true, status: response.status, statusText: response.statusText, body: base64 };
  } catch (error) {
    return { ok: false, status: 0, statusText: error.message, body: null };
  }
});

// ============ API KEY MANAGEMENT IPC ============
// The renderer sends plaintext keys during save ONLY — they are encrypted immediately
// and stored on disk. The renderer never receives plaintext keys back.

ipcMain.handle('save-api-keys', async (_event, keys) => {
  if (typeof keys !== 'object' || keys === null) {
    throw new Error('Invalid keys object');
  }
  for (const [key, value] of Object.entries(keys)) {
    if (key in apiKeyStore && typeof value === 'string') {
      // Non-empty string sets the key; empty string deletes it
      apiKeyStore[key] = value;
    }
  }
  persistApiKeys();
  return true;
});

ipcMain.handle('get-api-key-status', async () => {
  return {
    openaiApiKey: !!apiKeyStore.openaiApiKey,
    anthropicApiKey: !!apiKeyStore.anthropicApiKey,
    elevenLabsApiKey: !!apiKeyStore.elevenLabsApiKey,
    geminiApiKey: !!apiKeyStore.geminiApiKey,
  };
});

ipcMain.handle('clear-api-keys', async () => {
  apiKeyStore = { openaiApiKey: '', anthropicApiKey: '', elevenLabsApiKey: '', geminiApiKey: '' };
  try {
    const filePath = getApiKeysPath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to delete API keys file:', err.message);
  }
  return true;
});

// Desktop notifications
ipcMain.handle('show-notification', async (_event, { title, body, icon }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({ 
      title, 
      body,
      icon: icon || undefined,
      silent: false
    });
    notification.show();
    return true;
  }
  return false;
});


app.whenReady().then(() => {
  // Load encrypted API keys from disk into main-process memory
  loadApiKeys();

  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // Only apply CSP to the main app window — skip third-party origins
    // (Google OAuth, Spotify OAuth need their own scripts)
    try {
      const url = new URL(details.url);
      const isMainApp = url.hostname === 'localhost' || url.protocol === 'file:';
      if (!isMainApp) {
        callback({ responseHeaders: details.responseHeaders });
        return;
      }
    } catch {
      callback({ responseHeaders: details.responseHeaders });
      return;
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildCSP({ isDev })]
      }
    });
  });

  createWindow();
  createTray();
  registerMediaKeys();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  globalShortcut.unregisterAll();
  if (tray) { tray.destroy(); tray = null; }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

