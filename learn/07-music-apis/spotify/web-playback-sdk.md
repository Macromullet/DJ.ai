# Spotify Web Playback SDK

## Concept

The Spotify Web Playback SDK turns a web browser into a **virtual Spotify Connect device**. Instead of controlling playback on a phone or desktop app, the SDK creates a player instance inside your web page that can receive and play audio streams directly.

This is necessary because Spotify doesn't provide direct audio URLs — all playback goes through their SDK, which handles DRM, buffering, and audio quality selection.

## How It Works

### Loading the SDK

```html
<script src="https://sdk.scdn.co/spotify-player.js"></script>
```

### Creating a Player

```javascript
window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: 'DJ.ai',
    getOAuthToken: cb => { cb(accessToken); },
    volume: 0.5
  });

  // Event listeners
  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    // Use this device_id for playback API calls
  });

  player.addListener('player_state_changed', state => {
    // Track changes, play/pause, position updates
  });

  player.connect();
};
```

### Triggering Playback

Once the SDK player is connected, use the **Web API** to start playback on the SDK's device:

```http
PUT /v1/me/player/play?device_id={sdkDeviceId}
Content-Type: application/json

{ "uris": ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"] }
```

This two-step approach (SDK for audio, API for control) is Spotify's architecture — the SDK receives the stream, the API tells it what to play.

## How DJ.ai Uses the Web Playback SDK

In `electron-app/src/providers/SpotifyProvider.ts`:

1. **Initialization** — The SDK script is loaded dynamically, and a `Spotify.Player` instance is created with the app name "DJ.ai"
2. **Token callback** — `getOAuthToken` returns the current access token, with auto-refresh if expired
3. **Device registration** — When the `ready` event fires, the `device_id` is stored for use in playback API calls
4. **Playback control** — `playTrack()` calls `PUT /v1/me/player/play` with the SDK's device ID
5. **State tracking** — `player_state_changed` events update `getPlaybackState()` with current track, position, and playing status

### Device Transfer

When the user opens DJ.ai, playback may be active on another device (phone, desktop app). The SDK must "transfer" playback to itself:

```http
PUT /v1/me/player
{ "device_ids": ["{sdkDeviceId}"], "play": true }
```

## SDK Events

| Event | Purpose |
|-------|---------|
| `ready` | SDK connected, device ID available |
| `not_ready` | Device disconnected |
| `player_state_changed` | Track, position, or play state changed |
| `initialization_error` | SDK failed to initialize |
| `authentication_error` | Token expired or invalid |
| `account_error` | User doesn't have Spotify Premium |

## Important Limitations

- **Spotify Premium required** — Free tier users cannot use the Web Playback SDK
- **Single active device** — Spotify only allows one device to play at a time
- **Browser focus** — Some browsers throttle background tabs, affecting playback
- **No offline** — Streaming only, no caching/downloading

## Key Takeaways

- The Web Playback SDK creates a virtual Spotify Connect device in the browser
- Playback is controlled via the Web API, not the SDK directly — the SDK is the audio output
- A valid `device_id` from the SDK is required for all playback API calls
- Premium subscription is mandatory for SDK playback

## DJ.ai Connection

The Web Playback SDK enables DJ.ai to play Spotify audio natively in the Electron window — no external app needed. `SpotifyProvider.ts` manages the SDK lifecycle, device registration, and state tracking, all behind the `IMusicProvider` interface. The AI DJ commentary triggers alongside `player_state_changed` events.

## Further Reading

- [Spotify Web Playback SDK Documentation](https://developer.spotify.com/documentation/web-playback-sdk)
- [Web Playback SDK Quick Start](https://developer.spotify.com/documentation/web-playback-sdk/quick-start)
- [Spotify Connect Overview](https://developer.spotify.com/documentation/web-api/concepts/spotify-connect)
