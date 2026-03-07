# MusicKit JS SDK

## Concept

MusicKit JS is Apple's official JavaScript SDK for integrating Apple Music into web applications. Version 3 provides browser-based playback (including DRM-protected content), user authorization, and full API access — all from a single `<script>` tag.

Unlike Spotify's Web Playback SDK (which requires a separate player instance), MusicKit handles everything: auth, playback, and API calls through a unified instance.

## Core API

### Loading and Configuring

```javascript
// Load from Apple's CDN
<script src="https://js-cdn.music.apple.com/musickit/v3/musickit.js"></script>

// Configure with developer token
const music = await MusicKit.configure({
  developerToken: 'eyJ...',  // JWT from backend
  app: {
    name: 'DJ.ai',
    build: '1.0.0'
  }
});
```

### Authorization

```javascript
// Opens Apple's OAuth popup
const musicUserToken = await music.authorize();
// User logs into Apple ID → token returned
```

### Playback

```javascript
// Queue a specific song by Apple Music catalog ID
await music.setQueue({ song: '1613600977' });
await music.play();

// Playback controls
await music.pause();
await music.skipToNextItem();
await music.skipToPreviousItem();

// State: music.playbackState (2 = PLAYING)
```

### API Access

```javascript
// MusicKit instance provides authenticated API access
const results = await music.api.search('Daft Punk', { types: 'songs', limit: 10 });
```

## How DJ.ai Uses MusicKit JS

In `electron-app/src/providers/AppleMusicProvider.ts`:

1. **`loadMusicKitSDK()`** — Dynamically injects the MusicKit v3 script from `https://js-cdn.music.apple.com/musickit/v3/musickit.js`
2. **`waitForMusicKitReady()`** — Polls `window.MusicKit` with a 10-second timeout, ensuring the SDK is fully loaded before use
3. **`initializeMusicKit()`** — Calls `MusicKit.configure()` with the developer token fetched from the backend
4. **`authenticate()`** — Invokes `musicKitInstance.authorize()` to open Apple's login popup
5. **`playTrack()`** — Uses `musicKitInstance.setQueue({ song: trackId })` followed by `musicKitInstance.play()`
6. **`appleMusicFetch()`** — Custom wrapper for REST API calls, attaching both the developer token (Bearer) and Music User Token headers

### Playback State Tracking

```typescript
// AppleMusicProvider checks playbackState for UI updates
const state = this.musicKitInstance.playbackState;
// 0 = none, 1 = loading, 2 = playing, 3 = paused, 4 = stopped
```

## Common Pitfalls

- **SDK loading race conditions** — Always wait for `window.MusicKit` to be defined before calling `configure()`
- **Token expiry** — Developer tokens last 6 months but Music User Tokens expire; handle re-authorization gracefully
- **CORS** — MusicKit JS handles CORS internally; don't add custom headers that break its requests
- **Global state** — `window.MusicKit` is a singleton; only one instance per page

## Key Takeaways

- MusicKit JS v3 is a single SDK that handles auth, playback, and API access
- It manages DRM transparently — you call `play()`, Apple handles the rest
- The SDK is loaded dynamically and configured with a server-generated developer token
- Playback state is numeric (not string-based), requiring mapping for UI

## DJ.ai Connection

MusicKit JS is the reason Apple Music is DJ.ai's default provider — it offers the most seamless audio-first experience. No iframe embedding, no video player overhead, and DRM just works. The `AppleMusicProvider.ts` wraps MusicKit's global instance behind the `IMusicProvider` interface, keeping the rest of the app blissfully unaware of Apple-specific details.

## Further Reading

- [MusicKit JS Documentation](https://developer.apple.com/documentation/musickitjs)
- [MusicKit JS v3 Reference](https://js-cdn.music.apple.com/musickit/v3/docs/)
- [MusicKit JS Getting Started](https://developer.apple.com/documentation/musickitjs/getting_started_with_musickit_on_the_web)
