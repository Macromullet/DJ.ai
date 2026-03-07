// Preload script for main window - exposes Electron APIs to React app
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // OAuth deep link handler (for packaged app custom protocol)
  oauthDeepLink: {
    onCallback: (callback) => {
      const handler = (_event, url) => callback(url);
      ipcRenderer.on('oauth-deep-link', handler);
      return () => ipcRenderer.removeListener('oauth-deep-link', handler);
    },
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
    onPlaybackToggle: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('tray-playback-toggle', handler);
      return () => ipcRenderer.removeListener('tray-playback-toggle', handler);
    },
    onNextTrack: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('tray-next-track', handler);
      return () => ipcRenderer.removeListener('tray-next-track', handler);
    },
    onPreviousTrack: (callback) => {
      const handler = () => callback();
      ipcRenderer.on('tray-previous-track', handler);
      return () => ipcRenderer.removeListener('tray-previous-track', handler);
    }
  },

  // Check if running in Electron
  isElectron: true
});
