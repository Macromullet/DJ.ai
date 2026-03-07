# 07 — Music Streaming APIs

## Overview

Modern music streaming platforms expose REST APIs and JavaScript SDKs that enable third-party applications to search catalogs, control playback, and access user libraries. Each platform has its own authentication model, rate limits, and SDK quirks — but the core patterns are remarkably similar: authenticate → search → play → recommend.

DJ.ai abstracts these differences behind a unified **provider interface**, so the UI and AI services never know (or care) which streaming platform is active.

## The Provider Interface Pattern

Every music provider in DJ.ai implements the `IMusicProvider` interface defined in `electron-app/src/types/IMusicProvider.ts`. This gives the application a single, consistent API surface regardless of which backend is connected:

```typescript
interface IMusicProvider {
  providerId: string;
  providerName: string;
  isAuthenticated: boolean;

  authenticate(): Promise<AuthenticationResult>;
  handleOAuthCallback(url: string): Promise<AuthenticationResult>;
  signOut(): Promise<void>;

  searchTracks(query: string): Promise<SearchResult[]>;
  playTrack(result: SearchResult): Promise<void>;
  getRecommendations(track: Track): Promise<TrackRecommendation[]>;
  getUserTopTracks(): Promise<Track[]>;
  getUserPlaylists(): Promise<Playlist[]>;

  pause(): Promise<void>;
  play(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  getPlaybackState(): Promise<PlaybackState>;
}
```

## Current Provider Status

| Provider | File | Status |
|----------|------|--------|
| Apple Music | `AppleMusicProvider.ts` | ✅ Default provider, fully implemented |
| Spotify | `SpotifyProvider.ts` | ✅ Fully implemented |
| YouTube Music | `YouTubeMusicProvider.ts` | ⚠️ Search works, playback via iframe (UI removed) |

## Learning Path

1. **[Provider Pattern](./provider-pattern.md)** — Interface-based abstraction that ties everything together
2. **[Apple Music](./apple-music/)** — Default provider: MusicKit JS, developer tokens, Web API
3. **[Spotify](./spotify/)** — Web API, Web Playback SDK, OAuth with PKCE
4. **[YouTube](./youtube/)** — Data API v3, IFrame Player (historical)

## Key Takeaways

- All providers follow OAuth 2.0 (with provider-specific quirks like Apple's JWT developer tokens)
- Client secrets are protected on the backend (`oauth-proxy/Functions/`); API calls go directly from the Electron app
- The DI container (`electron-app/src/config/container.ts`) wires the active provider at runtime

## DJ.ai Connection

The `IMusicProvider` interface is the backbone of DJ.ai's multi-platform strategy. Adding a new streaming service means implementing this interface — not changing a single line of UI code. The AI commentary and TTS systems consume `Track` objects without knowing which provider produced them.

## Further Reading

- [Strategy Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/strategy)
- [OAuth 2.0 Simplified](https://www.oauth.com/)
