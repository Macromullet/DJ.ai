// Preload script for main window - exposes Electron APIs to React app
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // YouTube Music controls
  ytMusic: {
    playUrl: (url) => ipcRenderer.invoke('yt-music-play-url', url),
    control: (action) => ipcRenderer.invoke('yt-music-control', action),
    getTrack: () => ipcRenderer.invoke('yt-music-get-track'),
    show: () => ipcRenderer.invoke('yt-music-show'),
    hide: () => ipcRenderer.invoke('yt-music-hide'),
    search: (query) => ipcRenderer.invoke('yt-music-search', query)
  },

  // OAuth deep link handler (for packaged app custom protocol)
  oauthDeepLink: {
    onCallback: (callback) => ipcRenderer.on('oauth-deep-link', (event, url) => callback(url)),
    removeCallback: () => ipcRenderer.removeAllListeners('oauth-deep-link')
  },

  // Open OAuth window
  openOAuthWindow: (options) => ipcRenderer.invoke('open-oauth-window', options),

  // AI API proxy — routes requests through main process (bypasses CORS)
  aiProxy: {
    request: (options) => ipcRenderer.invoke('ai-api-request', options),
  },

  // safeStorage for encrypting API keys at rest
  safeStorage: {
    isAvailable: () => ipcRenderer.invoke('safe-storage-available'),
    encrypt: (plaintext) => ipcRenderer.invoke('safe-storage-encrypt', plaintext),
    decrypt: (encrypted) => ipcRenderer.invoke('safe-storage-decrypt', encrypted),
  },
  
  // Check if running in Electron
  isElectron: true
});
