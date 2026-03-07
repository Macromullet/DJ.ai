# YouTube IFrame Player API

## Concept

The YouTube IFrame Player API embeds a YouTube video player in a web page and provides JavaScript control over playback. It's the **only officially sanctioned way** to play YouTube content — YouTube's Terms of Service prohibit extracting audio streams or bypassing the IFrame Player.

The API loads an `<iframe>` element that hosts YouTube's player and exposes a `YT.Player` object for programmatic control.

## Core API

### Embedding the Player

```javascript
// Load the IFrame API
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

// Called automatically when API is ready
function onYouTubeIframeAPIReady() {
  const player = new YT.Player('player-container', {
    height: '360',
    width: '640',
    videoId: 'dQw4w9WgXcQ',
    playerVars: {
      autoplay: 1,
      controls: 1,
      modestbranding: 1
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
}
```

### Playback Controls

```javascript
player.playVideo();
player.pauseVideo();
player.stopVideo();
player.seekTo(seconds, allowSeekAhead);
player.nextVideo();      // Playlist only
player.previousVideo();  // Playlist only
player.setVolume(50);    // 0-100
player.mute();
player.unMute();
```

### State Change Events

```javascript
function onPlayerStateChange(event) {
  switch (event.data) {
    case YT.PlayerState.UNSTARTED: // -1
    case YT.PlayerState.ENDED:     //  0
    case YT.PlayerState.PLAYING:   //  1
    case YT.PlayerState.PAUSED:    //  2
    case YT.PlayerState.BUFFERING: //  3
    case YT.PlayerState.CUED:      //  5
  }
}
```

## How DJ.ai Used the IFrame Player

In the original DJ.ai architecture, the YouTube IFrame Player was embedded in the main `App` component (not in `YouTubeMusicProvider.ts`). The provider's playback methods are stubs with comments:

```typescript
// From YouTubeMusicProvider.ts
async pause(): Promise<void> {
  // Handled by YouTube IFrame Player in App component
}

async play(): Promise<void> {
  // Handled by YouTube IFrame Player in App component
}
```

This split (search in provider, playback in component) was awkward and is one reason the YouTube UI was removed. The `IMusicProvider` interface assumes playback is controlled by the provider, not by an external component.

### Why the IFrame Was Removed

1. **Visual requirement** — YouTube ToS requires the video player to be visible; hiding it violates the terms
2. **Audio-first conflict** — DJ.ai is an audio DJ app; showing music videos was off-brand
3. **Architecture mismatch** — Playback split between component and provider broke the interface pattern
4. **UX clutter** — The video player took up screen real estate that should be used for DJ controls

## Key Takeaways

- The IFrame Player API is the only legal way to play YouTube content in a web app
- YouTube requires the player to be visible — you cannot hide the iframe for audio-only playback
- Player state is event-driven via `onStateChange`, not polling-based
- The API uses a global `YT` namespace, similar to MusicKit's global `window.MusicKit`

## DJ.ai Connection

The YouTube IFrame Player's visual requirement was fundamentally incompatible with DJ.ai's audio-first design. This experience reinforced the value of the provider pattern: removing YouTube's UI was painless because the `IMusicProvider` interface isolated the change. MusicKit JS and Spotify Web Playback SDK both offer invisible audio playback, making them natural replacements.

## Further Reading

- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference)
- [YouTube Player Parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube API Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service)
