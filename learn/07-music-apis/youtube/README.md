# YouTube Music Integration

## Overview

YouTube Music was DJ.ai's original music provider. The `YouTubeMusicProvider.ts` (~503 lines) uses the **YouTube Data API v3** for search and recommendations. However, because YouTube is video-oriented (not audio-first), the UI has been removed — YouTube required an iframe video player, which conflicted with DJ.ai's audio-focused experience.

The code is preserved for reference and potential future use, but Apple Music and Spotify are the active providers.

## Architecture

```
┌──────────────────────────────┐
│   YouTubeMusicProvider.ts     │
│   (Data API v3 + iframe)      │
├──────────────────────────────┤
│  OAuth Token (Google)         │◄── Backend exchanges code for tokens
│  OR API Key (fallback)        │◄── Legacy backwards compatibility
├──────────────────────────────┤
│  YouTube Data API v3          │◄── Search, metadata, related videos
│  IFrame Player API            │◄── Video playback (UI removed)
└──────────────────────────────┘
```

## Key Concepts

| Topic | File | Description |
|-------|------|-------------|
| [Data API](./data-api.md) | Search and metadata | `search.list`, `videos.list` |
| [IFrame Player](./iframe-player.md) | Video playback | Embedded player (historical) |
| [OAuth](./oauth.md) | Google authentication | OAuth 2.0 with YouTube scopes |

## Current Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Search | ✅ Implemented | `videoCategoryId=10` filters for music |
| Recommendations | ✅ Implemented | `relatedToVideoId` parameter |
| OAuth | ✅ Implemented | Google OAuth via backend |
| Playback | ⚠️ Stub | "Handled by YouTube IFrame Player in App component" |
| User library | ❌ Not implemented | Returns empty arrays |
| Playlists | ⚠️ Partial | Playlist tracks retrieval works |

## Dual Authentication

YouTube provider supports two auth modes:
1. **OAuth tokens** — Full user access, obtained via `YouTubeOAuthFunctions.cs`
2. **API key** — Read-only catalog access, fallback for backwards compatibility

## Why YouTube Was Deprioritized

- **Video-first** — YouTube API returns video content; audio-only playback requires hiding the video player
- **IFrame requirement** — YouTube Terms of Service require the official IFrame Player, which is a visual video element
- **Quota costs** — YouTube Data API has strict daily quotas (10,000 units/day by default)
- **Audio quality** — YouTube audio compression is optimized for video, not music listening

## Key Takeaways

- YouTube Data API v3 works well for search and metadata, but is fundamentally video-oriented
- The IFrame Player requirement makes it unsuitable for an audio-first DJ application
- Code is preserved as a reference implementation of `IMusicProvider`
- Dual auth (OAuth + API key) shows how to support multiple authentication strategies

## DJ.ai Connection

YouTube Music's history in DJ.ai demonstrates why the provider pattern matters: swapping the default provider from YouTube to Apple Music required zero UI changes. The `IMusicProvider` interface absorbed the transition entirely. The YouTube code remains as a complete example of the pattern.

## Further Reading

- [YouTube Data API v3 Overview](https://developers.google.com/youtube/v3)
- [YouTube API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube Terms of Service — API](https://developers.google.com/youtube/terms/api-services-terms-of-service)
