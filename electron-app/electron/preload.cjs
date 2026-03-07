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
    ttsRequest: (options) => ipcRenderer.invoke('ai-tts-request', options),
  },

  // safeStorage for encrypting API keys at rest
  safeStorage: {
    isAvailable: () => ipcRenderer.invoke('safe-storage-available'),
    encrypt: (plaintext) => ipcRenderer.invoke('safe-storage-encrypt', plaintext),
    decrypt: (encrypted) => ipcRenderer.invoke('safe-storage-decrypt', encrypted),
  },
  
  // Desktop notifications
  notifications: {
    show: (options) => ipcRenderer.invoke('show-notification', options)
  },

  // System tray controls
  tray: {
    updateInfo: (info) => ipcRenderer.invoke('update-tray-info', info),
    onPlaybackToggle: (callback) => ipcRenderer.on('tray-playback-toggle', () => callback()),
    onNextTrack: (callback) => ipcRenderer.on('tray-next-track', () => callback()),
    onPreviousTrack: (callback) => ipcRenderer.on('tray-previous-track', () => callback())
  },

  // Check if running in Electron
  isElectron: true
});
