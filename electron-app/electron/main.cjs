const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let ytMusicWindow = null;
let oauthWindow = null;

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
  // Parse djai://oauth/callback?code=XXX&state=YYY
  if (mainWindow && url.startsWith('djai://oauth/callback')) {
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
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      } else {
        console.warn(`Blocked openExternal for disallowed protocol: ${parsed.protocol}`);
      }
    } catch (e) {
      console.warn('Blocked openExternal for invalid URL:', url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (ytMusicWindow) ytMusicWindow.close();
  });
}

function createYouTubeMusicWindow() {
  if (ytMusicWindow) {
    return ytMusicWindow;
  }

  ytMusicWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: '#000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'ytmusic-preload.cjs')
    },
    title: 'YouTube Music Player',
    show: false
  });

  ytMusicWindow.loadURL('https://music.youtube.com');

  // Show dev tools in development
  if (isDev) {
    ytMusicWindow.webContents.openDevTools();
  }

  ytMusicWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(url);
      } else {
        console.warn(`Blocked openExternal for disallowed protocol: ${parsed.protocol}`);
      }
    } catch (e) {
      console.warn('Blocked openExternal for invalid URL:', url);
    }
    return { action: 'deny' };
  });

  ytMusicWindow.on('closed', () => {
    ytMusicWindow = null;
  });

  return ytMusicWindow;
}

// Allowlist of valid playback control actions
const VALID_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);

// IPC Handlers for YouTube Music control
ipcMain.handle('yt-music-play-url', async (event, url) => {
  if (!url || !url.startsWith('https://music.youtube.com/')) {
    return { success: false, error: 'Invalid YouTube Music URL' };
  }

  if (!ytMusicWindow) {
    createYouTubeMusicWindow();
  }
  
  ytMusicWindow.loadURL(url);
  ytMusicWindow.show();
  return true;
});

ipcMain.handle('yt-music-control', async (event, action) => {
  if (!ytMusicWindow) {
    return false;
  }

  if (!VALID_ACTIONS.has(action)) {
    console.error('Invalid YT Music control action:', action);
    return false;
  }

  // Map validated actions to pre-built safe code snippets
  const actionScripts = {
    play: `(function() { const btn = document.querySelector('#play-pause-button'); if (btn) { btn.click(); return true; } return false; })();`,
    pause: `(function() { const btn = document.querySelector('#play-pause-button'); if (btn) { btn.click(); return true; } return false; })();`,
    next: `(function() { const btn = document.querySelector('.next-button'); if (btn) { btn.click(); return true; } return false; })();`,
    previous: `(function() { const btn = document.querySelector('.previous-button'); if (btn) { btn.click(); return true; } return false; })();`
  };

  try {
    const result = await ytMusicWindow.webContents.executeJavaScript(actionScripts[action]);
    return result;
  } catch (error) {
    console.error('YT Music control error:', error);
    return false;
  }
});

ipcMain.handle('yt-music-get-track', async (event) => {
  if (!ytMusicWindow) {
    return null;
  }

  try {
    const track = await ytMusicWindow.webContents.executeJavaScript(`
      (function() {
        const title = document.querySelector('.title.style-scope.ytmusic-player-bar')?.innerText;
        const artist = document.querySelector('.byline.style-scope.ytmusic-player-bar')?.innerText;
        const thumbnail = document.querySelector('#song-image img')?.src;
        
        if (title) {
          return { title, artist, thumbnail };
        }
        return null;
      })();
    `);
    return track;
  } catch (error) {
    console.error('Get track error:', error);
    return null;
  }
});

ipcMain.handle('yt-music-show', async (event) => {
  if (!ytMusicWindow) {
    createYouTubeMusicWindow();
  }
  ytMusicWindow.show();
  return true;
});

ipcMain.handle('yt-music-hide', async (event) => {
  if (ytMusicWindow) {
    ytMusicWindow.hide();
  }
  return true;
});

ipcMain.handle('yt-music-search', async (event, query) => {
  if (!ytMusicWindow) {
    createYouTubeMusicWindow();
  }

  // Safely escape query for JavaScript interpolation
  const safeQuery = JSON.stringify(query);

  try {
    await ytMusicWindow.webContents.executeJavaScript(`
      (function() {
        const searchBox = document.querySelector('ytmusic-search-box');
        if (searchBox) {
          searchBox.click();
          setTimeout(() => {
            const input = document.querySelector('#input.ytmusic-search-box');
            if (input) {
              input.value = ${safeQuery};
              input.dispatchEvent(new Event('input', { bubbles: true }));
              const form = input.closest('form');
              if (form) {
                form.dispatchEvent(new Event('submit', { bubbles: true }));
              }
            }
          }, 200);
          return true;
        }
        return false;
      })();
    `);
    
    ytMusicWindow.show();
    return true;
  } catch (error) {
    console.error('Search error:', error);
    return false;
  }
});

// OAuth Window Handler
ipcMain.handle('open-oauth-window', async (event, { url, redirectUri }) => {
  if (oauthWindow) {
    oauthWindow.focus();
    return;
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

  // Validate the OAuth URL before loading
  const ALLOWED_OAUTH_HOSTS = new Set([
    'accounts.google.com',
    'accounts.spotify.com',
    'appleid.apple.com',
    'authorize.music.apple.com',
  ]);

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      console.error(`open-oauth-window blocked: only HTTPS is allowed (got ${parsed.protocol})`);
      return { error: 'Only HTTPS OAuth URLs are allowed' };
    }
    if (!ALLOWED_OAUTH_HOSTS.has(parsed.hostname)) {
      console.error(`open-oauth-window blocked: ${parsed.hostname} is not an allowed OAuth host`);
      return { error: 'OAuth host not in allowlist' };
    }
  } catch (e) {
    console.error('open-oauth-window blocked: invalid URL', url);
    return { error: 'Invalid OAuth URL' };
  }

  oauthWindow.loadURL(url);

  // Monitor navigation for callback
  const filter = {
    urls: [redirectUri + '*']
  };

  oauthWindow.webContents.on('will-redirect', (event) => {
    const newUrl = event.url;
    if (newUrl.startsWith(redirectUri)) {
      event.preventDefault();
      // Send the callback URL to the main window
      if (mainWindow) {
        mainWindow.webContents.send('oauth-deep-link', newUrl);
      }
      oauthWindow.close();
    }
  });

  oauthWindow.webContents.on('will-navigate', (event) => {
    const newUrl = event.url;
    if (newUrl.startsWith(redirectUri)) {
      event.preventDefault();
      if (mainWindow) {
        mainWindow.webContents.send('oauth-deep-link', newUrl);
      }
      oauthWindow.close();
    }
  });

  oauthWindow.on('closed', () => {
    oauthWindow = null;
  });
});

// AI API proxy — routes requests through the main process to bypass CORS
const AI_API_ALLOWLIST = new Set([
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.elevenlabs.io',
]);

ipcMain.handle('ai-api-request', async (event, { url, method, headers, body }) => {
  try {
    const parsed = new URL(url);
    if (!AI_API_ALLOWLIST.has(parsed.hostname)) {
      console.error(`ai-api-request blocked: ${parsed.hostname} is not in the allowlist`);
      return {
        ok: false,
        status: 403,
        statusText: 'Forbidden: domain not in allowlist',
        body: null,
      };
    }

    if (parsed.protocol !== 'https:') {
      console.error(`ai-api-request blocked: only HTTPS is allowed (got ${parsed.protocol})`);
      return {
        ok: false,
        status: 403,
        statusText: 'Only HTTPS requests are allowed',
        body: null,
      };
    }

    const response = await fetch(parsed.href, {
      method: method || 'POST',
      headers: headers || {},
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
    const parsed = new URL(url);
    if (!AI_API_ALLOWLIST.has(parsed.hostname)) {
      return { ok: false, status: 403, statusText: 'Forbidden: domain not in allowlist', body: null };
    }
    if (parsed.protocol !== 'https:') {
      return { ok: false, status: 403, statusText: 'Only HTTPS requests are allowed', body: null };
    }

    const response = await fetch(parsed.href, {
      method: method || 'POST',
      headers: headers || {},
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, status: response.status, statusText: response.statusText, body: errorText };
    }

    // Return binary audio as base64
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { ok: true, status: response.status, statusText: response.statusText, body: base64 };
  } catch (error) {
    return { ok: false, status: 0, statusText: error.message, body: null };
  }
});

// safeStorage IPC handlers
ipcMain.handle('safe-storage-available', () => {
  return safeStorage.isEncryptionAvailable();
});

ipcMain.handle('safe-storage-encrypt', (event, plaintext) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available');
  }
  return safeStorage.encryptString(plaintext).toString('base64');
});

// SECURITY NOTE: Exposing a general-purpose decrypt IPC means that any XSS in
// the renderer can exfiltrate all stored API keys. The ideal fix is to remove
// this endpoint entirely and have the main process attach keys internally (see
// ai-api-request handler). Until that refactor, rate-limit calls to mitigate
// automated exfiltration.
const decryptCallTimestamps = [];
const DECRYPT_MAX_CALLS = 10;
const DECRYPT_WINDOW_MS = 60_000; // 1 minute

ipcMain.handle('safe-storage-decrypt', (event, encrypted) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available');
  }

  const now = Date.now();
  // Evict timestamps outside the current window
  while (decryptCallTimestamps.length > 0 && decryptCallTimestamps[0] <= now - DECRYPT_WINDOW_MS) {
    decryptCallTimestamps.shift();
  }
  if (decryptCallTimestamps.length >= DECRYPT_MAX_CALLS) {
    console.error('safe-storage-decrypt rate limit exceeded');
    throw new Error('Rate limit exceeded for decryption — max 10 calls per minute');
  }
  decryptCallTimestamps.push(now);

  const buffer = Buffer.from(encrypted, 'base64');
  return safeStorage.decryptString(buffer);
});

app.whenReady().then(() => {
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          // 'unsafe-inline' is required for Vite HMR script injection in development
          // and for inline event handlers used by YouTube embeds. TODO: Replace with
          // nonce-based CSP once Vite supports nonce injection for HMR scripts.
          "script-src 'self' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com https://sdk.scdn.co https://apisdk.scdn.co https://js-cdn.music.apple.com; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https: http:; " +
          "media-src 'self' https:; " +
          "connect-src 'self' http://localhost:* https://*.azurewebsites.net https://*.azurestaticapps.net https://api.openai.com https://api.anthropic.com https://www.googleapis.com https://accounts.google.com https://api.spotify.com https://accounts.spotify.com https://apisdk.scdn.co https://api.music.apple.com https://authorize.music.apple.com; " +
          "frame-src https://www.youtube.com https://music.youtube.com;"
        ]
      }
    });
  });

  createWindow();
  createYouTubeMusicWindow();
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

