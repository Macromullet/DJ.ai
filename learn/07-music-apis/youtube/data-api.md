# YouTube Data API v3

## Concept

The YouTube Data API v3 provides programmatic access to YouTube's video catalog, channels, playlists, and search functionality. For music applications, it enables searching the music catalog (category ID 10), retrieving video metadata, and finding related content.

All endpoints are served from `https://www.googleapis.com/youtube/v3/`.

## Key Endpoints

### Search

```http
GET /youtube/v3/search
  ?part=snippet
  &type=video
  &videoCategoryId=10
  &q=daft+punk
  &maxResults=25
  &key={apiKey}
```

The `videoCategoryId=10` filter restricts results to the Music category — critical for a music app to avoid getting tutorials, vlogs, and other non-music content.

### Video Details

```http
GET /youtube/v3/videos
  ?part=snippet,contentDetails,statistics
  &id=dQw4w9WgXcQ
  &key={apiKey}
```

Returns full metadata including duration (`contentDetails.duration` in ISO 8601), view count, and HD thumbnail URLs.

### Related Videos (Recommendations)

```http
GET /youtube/v3/search
  ?part=snippet
  &type=video
  &relatedToVideoId=dQw4w9WgXcQ
  &videoCategoryId=10
  &maxResults=10
  &key={apiKey}
```

The `relatedToVideoId` parameter powers DJ.ai's recommendation feature for YouTube content.

### Playlist Items

```http
GET /youtube/v3/playlistItems
  ?part=snippet,contentDetails
  &playlistId=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf
  &maxResults=50
  &key={apiKey}
```

## How DJ.ai Uses the Data API

In `electron-app/src/providers/YouTubeMusicProvider.ts`:

```typescript
async searchTracks(query: string): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&type=video&videoCategoryId=10` +
    `&q=${encodeURIComponent(query)}&maxResults=25`;

  // Uses OAuth token if available, falls back to API key
  const response = await this.youtubeFetch(url);
  const data = await response.json();
  return data.items.map(this.mapToSearchResult);
}
```

### Dual Authentication

The YouTube provider supports two authentication methods:
- **OAuth token** — Sent as `Authorization: Bearer {token}` for user-specific operations
- **API key** — Appended as `?key={apiKey}` for read-only catalog access (fallback)

## API Quotas

YouTube enforces strict daily quotas measured in "units":

| Operation | Cost |
|-----------|------|
| `search.list` | 100 units |
| `videos.list` | 1 unit |
| `playlistItems.list` | 1 unit |
| **Daily limit** | **10,000 units** (default) |

A single search costs 100 units, meaning only ~100 searches per day with a default quota. This is a significant constraint for a music application.

## Key Takeaways

- `videoCategoryId=10` is essential for filtering music content from YouTube's general video catalog
- Search is expensive (100 units) — debounce and cache aggressively
- `relatedToVideoId` provides music recommendations based on YouTube's algorithm
- The API returns video metadata, not audio metadata — duration, thumbnails, and descriptions are video-oriented

## DJ.ai Connection

The YouTube Data API powers search and recommendations in `YouTubeMusicProvider.ts`. The dual-auth approach (OAuth + API key) demonstrates how a provider can support both authenticated and anonymous access patterns. However, the 100-unit search cost and video-oriented responses led to YouTube being deprioritized in favor of Apple Music and Spotify.

## Further Reading

- [YouTube Data API v3 Overview](https://developers.google.com/youtube/v3)
- [Search: list Reference](https://developers.google.com/youtube/v3/docs/search/list)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Video Categories](https://developers.google.com/youtube/v3/docs/videoCategories/list)
