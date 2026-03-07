# Apple Music Web API

## Concept

The Apple Music API is a RESTful service that provides access to Apple's music catalog (90+ million songs), user libraries, playlists, and personalized recommendations. It uses two authentication tokens: a **Developer Token** (for catalog access) and a **Music User Token** (for personal data).

All endpoints are served from `https://api.music.apple.com/v1/`.

## Key Endpoints

### Catalog Search

```http
GET /v1/catalog/{storefront}/search?term=daft+punk&types=songs&limit=25
Authorization: Bearer {developerToken}
```

Returns matching songs, albums, artists, and playlists from the public catalog.

### User Library

```http
GET /v1/me/library/songs
Authorization: Bearer {developerToken}
Music-User-Token: {musicUserToken}
```

Requires the Music User Token for personal data access. Also available: `/me/library/playlists`, `/me/library/albums`.

### Recommendations

```http
GET /v1/me/recommendations
Authorization: Bearer {developerToken}
Music-User-Token: {musicUserToken}
```

Returns personalized recommendations based on listening history.

### Track by ID

```http
GET /v1/catalog/{storefront}/songs/{id}
Authorization: Bearer {developerToken}
```

Retrieve full metadata for a specific track.

## How DJ.ai Uses the Web API

In `electron-app/src/providers/AppleMusicProvider.ts`, the `appleMusicFetch()` helper method wraps all API calls:

```typescript
private async appleMusicFetch(path: string): Promise<Response> {
  return fetch(`https://api.music.apple.com${path}`, {
    headers: {
      'Authorization': `Bearer ${this.developerToken}`,
      'Music-User-Token': this.musicUserToken
    }
  });
}
```

### Search Implementation

```typescript
async searchTracks(query: string): Promise<SearchResult[]> {
  const response = await this.appleMusicFetch(
    `/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=25`
  );
  const data = await response.json();
  return data.results.songs.data.map(this.mapToSearchResult);
}
```

### Important: Direct Client Calls

Following DJ.ai's **OAuth-only middle tier** pattern, all Apple Music API calls go directly from the Electron app to `api.music.apple.com`. The backend (`oauth-proxy`) only generates developer tokens — it never proxies API requests.

## Response Format

Apple Music API returns JSON:API-style responses:

```json
{
  "results": {
    "songs": {
      "data": [
        {
          "id": "1613600977",
          "type": "songs",
          "attributes": {
            "name": "Get Lucky",
            "artistName": "Daft Punk",
            "albumName": "Random Access Memories",
            "durationInMillis": 369000,
            "artwork": { "url": "https://...", "width": 3000, "height": 3000 }
          }
        }
      ]
    }
  }
}
```

## Key Takeaways

- Two tokens required: Developer Token (catalog) + Music User Token (personal data)
- Storefront codes (e.g., `us`, `gb`) determine regional catalog availability
- Artwork URLs contain `{w}x{h}` placeholders that must be replaced with desired dimensions
- Rate limits exist but are generous for typical usage patterns

## DJ.ai Connection

The Apple Music Web API powers DJ.ai's search, recommendations, and library features. The `AppleMusicProvider.ts` maps Apple's JSON:API responses to DJ.ai's generic `SearchResult` and `Track` types, ensuring the UI layer never sees Apple-specific data structures.

## Further Reading

- [Apple Music API Documentation](https://developer.apple.com/documentation/applemusicapi)
- [Apple Music API — Searching for Catalog Resources](https://developer.apple.com/documentation/applemusicapi/search_for_catalog_resources)
- [Storefronts Reference](https://developer.apple.com/documentation/applemusicapi/storefronts)
