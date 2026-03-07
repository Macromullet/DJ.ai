# Spotify Web API

## Concept

The Spotify Web API is a RESTful service providing access to Spotify's catalog of 100+ million tracks, user libraries, playlists, and personalized recommendations. All endpoints are served from `https://api.spotify.com/v1/` and require OAuth 2.0 bearer tokens.

Unlike Apple Music's two-token model, Spotify uses a single access token obtained through standard OAuth 2.0 authorization code flow.

## Key Endpoints

### Search

```http
GET /v1/search?q=daft+punk&type=track&limit=25
Authorization: Bearer {accessToken}
```

Returns tracks, albums, artists, and playlists matching the query. The `type` parameter controls which resource types are returned.

### Get Track

```http
GET /v1/tracks/{id}
Authorization: Bearer {accessToken}
```

### Start/Resume Playback

```http
PUT /v1/me/player/play?device_id={deviceId}
Authorization: Bearer {accessToken}
Content-Type: application/json

{ "uris": ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"] }
```

The `device_id` parameter targets a specific device — in DJ.ai's case, the Web Playback SDK instance.

### Recommendations

```http
GET /v1/recommendations?seed_tracks=4iV5W9uYEdYUVa79Axb7Rh&limit=20
Authorization: Bearer {accessToken}
```

Spotify's recommendation engine uses seed tracks, artists, or genres plus tunable attributes (energy, tempo, valence) to generate suggestions.

### User Top Tracks

```http
GET /v1/me/top/tracks?time_range=medium_term&limit=20
Authorization: Bearer {accessToken}
```

### User Playlists

```http
GET /v1/me/playlists
Authorization: Bearer {accessToken}
```

## How DJ.ai Uses the Web API

In `electron-app/src/providers/SpotifyProvider.ts`:

```typescript
async searchTracks(query: string): Promise<SearchResult[]> {
  const response = await this.spotifyFetch(
    `/v1/search?q=${encodeURIComponent(query)}&type=track&limit=25`
  );
  const data = await response.json();
  return data.tracks.items.map(this.mapToSearchResult);
}
```

The `spotifyFetch()` helper automatically attaches the bearer token and handles token refresh if a 401 response is received.

### Direct Client Calls

Following DJ.ai's architecture, all Spotify API calls go directly from the Electron app to `api.spotify.com`. The backend (`SpotifyOAuthFunctions.cs`) only handles token exchange and refresh.

## Response Format

Spotify uses standard JSON (not JSON:API like Apple):

```json
{
  "tracks": {
    "items": [
      {
        "id": "4iV5W9uYEdYUVa79Axb7Rh",
        "name": "Get Lucky",
        "artists": [{ "name": "Daft Punk" }],
        "album": {
          "name": "Random Access Memories",
          "images": [{ "url": "https://...", "width": 640, "height": 640 }]
        },
        "duration_ms": 369000,
        "uri": "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
      }
    ]
  }
}
```

## Key Takeaways

- Single bearer token for all API calls (simpler than Apple's two-token model)
- Device targeting via `device_id` is essential for Web Playback SDK integration
- Recommendations API accepts tunable attributes for fine-grained control
- Pagination uses `next` URLs or `offset`/`limit` parameters

## DJ.ai Connection

The Spotify Web API powers search, recommendations, library access, and playback control in `SpotifyProvider.ts`. Response objects are mapped to DJ.ai's generic `SearchResult` and `Track` types, maintaining the provider abstraction.

## Further Reading

- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)
- [Search API](https://developer.spotify.com/documentation/web-api/reference/search)
- [Recommendations API](https://developer.spotify.com/documentation/web-api/reference/get-recommendations)
- [Player API](https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback)
