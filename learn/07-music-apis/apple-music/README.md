# Apple Music Integration

## Overview

Apple Music is the **default provider** in DJ.ai. It uses a unique two-token authentication model: a **Developer Token** (JWT signed server-side) and a **Music User Token** (obtained client-side via MusicKit JS). This combination gives the app full access to Apple's catalog, the user's library, and in-browser playback.

The implementation lives in `electron-app/src/providers/AppleMusicProvider.ts` (~536 lines) with backend support from `oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`.

## Architecture

```
┌─────────────────────────┐
│   AppleMusicProvider.ts  │
│   (MusicKit JS SDK v3)   │
├─────────────────────────┤
│  Developer Token (JWT)   │◄── Backend generates (ES256 + Key Vault)
│  Music User Token        │◄── MusicKit.authorize() popup
├─────────────────────────┤
│  Apple Music REST API    │◄── Direct client calls
│  MusicKit Playback       │◄── setQueue() + play()
└─────────────────────────┘
```

## Key Concepts

| Topic | File | Description |
|-------|------|-------------|
| [MusicKit JS](./musickit-js.md) | SDK for playback and auth | `MusicKit.configure()`, `authorize()`, `setQueue()` |
| [Web API](./web-api.md) | REST endpoints | Catalog search, library access, recommendations |
| [Developer Tokens](./developer-tokens.md) | JWT generation | ES256 signing, Team ID, Key ID |
| [Music User Tokens](./music-user-tokens.md) | User authorization | MusicKit popup, token storage |

## How DJ.ai Uses Apple Music

1. **Initialization** — `AppleMusicProvider` loads MusicKit JS v3 from Apple's CDN, then calls `MusicKit.configure()` with the developer token
2. **Authentication** — User clicks Connect → `MusicKit.authorize()` opens Apple's login popup → Music User Token returned
3. **Search** — Direct REST call to `/v1/catalog/us/search?term=...&types=songs` with bearer token
4. **Playback** — `musicKitInstance.setQueue({ song: trackId })` then `musicKitInstance.play()`
5. **Recommendations** — `/v1/me/recommendations` using the Music User Token
6. **Library** — `/v1/me/library/songs`, `/v1/me/library/playlists`

## What Makes Apple Music Unique

- **Two-token model** — Developer Token (server-generated JWT) + Music User Token (client-obtained)
- **MusicKit JS** — Apple's official SDK handles DRM, playback, and auth in the browser
- **No PKCE flow** — Unlike Spotify/Google, Apple uses its own authorization via MusicKit
- **Token caching** — Developer tokens are cached server-side with semaphore-based thread safety (6-month validity)

## Key Takeaways

- Apple Music requires both a developer token (from backend) and a user token (from MusicKit popup)
- MusicKit JS handles DRM playback natively — no iframe or SDK embedding needed
- The backend (`AppleMusicOAuthFunctions.cs`) generates and caches developer tokens; it does not proxy API calls

## DJ.ai Connection

Apple Music was chosen as the default provider because MusicKit JS offers the most integrated browser playback experience — audio-first, no video player overhead. The two-token model aligns with DJ.ai's "OAuth-only middle tier" architecture: secrets stay on the server, API calls stay on the client.

## Further Reading

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [MusicKit JS Documentation](https://developer.apple.com/documentation/musickitjs)
