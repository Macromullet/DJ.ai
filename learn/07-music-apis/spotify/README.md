# Spotify Integration

## Overview

Spotify is a fully implemented provider in DJ.ai. The implementation uses Spotify's **Web API** for search, library, and metadata operations and the **Web Playback SDK** for in-browser audio playback. Authentication follows standard OAuth 2.0 with token refresh handled by the backend.

The implementation lives in `electron-app/src/providers/SpotifyProvider.ts` (~685 lines) with backend support from `oauth-proxy/Functions/SpotifyOAuthFunctions.cs`.

## Architecture

```
┌─────────────────────────┐
│    SpotifyProvider.ts    │
│   (Web API + Playback)   │
├─────────────────────────┤
│  Access Token (OAuth)    │◄── Backend exchanges code for tokens
│  Refresh Token           │◄── Backend handles refresh
├─────────────────────────┤
│  Spotify Web API         │◄── Direct client calls (search, library)
│  Web Playback SDK        │◄── In-browser playback device
└─────────────────────────┘
```

## Key Concepts

| Topic | File | Description |
|-------|------|-------------|
| [Web API](./web-api.md) | REST endpoints | Search, playback control, recommendations |
| [Web Playback SDK](./web-playback-sdk.md) | Browser playback | Create a virtual player device |
| [OAuth](./oauth.md) | Authentication | OAuth 2.0 flow with PKCE |
| [Rate Limits](./rate-limits.md) | Throttling | 429 handling, retry-after |

## OAuth Scopes Used

DJ.ai requests these Spotify scopes:

```
user-read-private       user-read-email
user-library-read       user-top-read
playlist-read-private   playlist-read-collaborative
streaming               user-read-playback-state
user-modify-playback-state  user-read-currently-playing
```

## How DJ.ai Uses Spotify

1. **Authentication** — OAuth 2.0 flow initiated via `POST /oauth/spotify/initiate`, code exchanged via `POST /oauth/spotify/exchange`
2. **Search** — Direct call to `https://api.spotify.com/v1/search?type=track`
3. **Playback** — Web Playback SDK creates a virtual device; playback triggered via `/v1/me/player/play?device_id=...`
4. **Recommendations** — `/v1/recommendations?seed_tracks=` with track-based seeding
5. **Token refresh** — Automatic refresh with 5-minute buffer before expiry via `POST /oauth/spotify/refresh`

## Key Takeaways

- Spotify uses standard OAuth 2.0 (the most conventional of DJ.ai's three providers)
- Web Playback SDK is required for in-browser audio — Spotify doesn't stream directly via URL
- Token auto-refresh with a 5-minute buffer prevents playback interruption
- Rate limits require retry-after handling for production reliability

## DJ.ai Connection

Spotify is the most feature-complete standard OAuth provider in DJ.ai. Its implementation in `SpotifyProvider.ts` serves as the reference example for the `IMusicProvider` interface pattern — comprehensive, well-structured, and fully functional.

## Further Reading

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
