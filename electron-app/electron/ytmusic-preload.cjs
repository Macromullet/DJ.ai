// Preload script to inject into YouTube Music web player
// This allows us to control playback by injecting JavaScript

const { contextBridge, ipcRenderer } = require('electron');

// Expose YouTube Music controls to the renderer
contextBridge.exposeInMainWorld('ytMusic', {
  // Search for a track
  search: (query) => {
    const searchButton = document.querySelector('ytmusic-search-box');
    if (searchButton) {
      searchButton.click();
      setTimeout(() => {
        const input = document.querySelector('#input');
        if (input) {
          input.value = query;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          // Trigger search
          const form = document.querySelector('form');
          if (form) form.submit();
        }
      }, 100);
    }
  },

  // Play a specific track by clicking on it
  playTrack: (trackTitle) => {
    // Find track by title and click it
    const tracks = document.querySelectorAll('ytmusic-responsive-list-item-renderer');
    for (const track of tracks) {
      if (track.innerText.includes(trackTitle)) {
        track.click();
        return true;
      }
    }
    return false;
  },

  // Play/pause
  playPause: () => {
    const button = document.querySelector('#play-pause-button');
    if (button) button.click();
  },

  // Next track
  next: () => {
    const button = document.querySelector('.next-button');
    if (button) button.click();
  },

  // Previous track
  previous: () => {
    const button = document.querySelector('.previous-button');
    if (button) button.click();
  },

  // Get current track info
  getCurrentTrack: () => {
    const title = document.querySelector('.title')?.innerText;
    const artist = document.querySelector('.byline')?.innerText;
    const thumbnail = document.querySelector('img.image')?.src;
    
    return title ? { title, artist, thumbnail } : null;
  }
});

// Listen for playback state changes
window.addEventListener('DOMContentLoaded', () => {
  // Observer to watch for track changes
  const observer = new MutationObserver(() => {
    const track = window.ytMusic?.getCurrentTrack();
    if (track) {
      ipcRenderer.send('track-changed', track);
    }
  });

  // Observe title changes
  const titleElement = document.querySelector('.title');
  if (titleElement) {
    observer.observe(titleElement, { childList: true, subtree: true });
  }
});
