# Spotify API Rate Limits

## Concept

Spotify enforces rate limits to protect its infrastructure and ensure fair API access. When your application exceeds the allowed request rate, Spotify returns a **429 Too Many Requests** response with a `Retry-After` header indicating how many seconds to wait before retrying.

Rate limits are applied per app (client ID) and are not publicly documented with exact numbers — they vary based on endpoint, request patterns, and your app's overall usage.

## How Rate Limiting Works

### 429 Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{
  "error": {
    "status": 429,
    "message": "API rate limit exceeded"
  }
}
```

### Retry-After Header

The `Retry-After` value (in seconds) tells you exactly how long to wait. Always respect this value rather than implementing fixed backoff delays.

## Best Practices

### 1. Exponential Backoff with Retry-After

```typescript
async function spotifyFetchWithRetry(url: string, token: string, retries = 3): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (response.status === 429 && retries > 0) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return spotifyFetchWithRetry(url, token, retries - 1);
  }

  return response;
}
```

### 2. Request Batching

Instead of making individual requests for each track, use batch endpoints:

```http
GET /v1/tracks?ids=id1,id2,id3,id4,id5  // Up to 50 IDs
```

### 3. Caching

Cache responses for data that doesn't change frequently (album art, track metadata). Spotify's cache headers can guide your TTL.

### 4. Conditional Requests

Use `If-None-Match` with ETags where supported to avoid consuming rate limit quota on unchanged resources.

## Common Rate Limit Scenarios

| Scenario | Risk Level | Mitigation |
|----------|------------|------------|
| Search on every keystroke | 🔴 High | Debounce input (300ms minimum) |
| Polling playback state | 🟡 Medium | Poll every 1-5 seconds, not continuously |
| Loading full library | 🟡 Medium | Paginate with delays between pages |
| Initial app load | 🟢 Low | Batch requests where possible |

## How DJ.ai Handles Rate Limits

DJ.ai implements rate limiting at two levels:

### Client-Side (SpotifyProvider.ts)

The `spotifyFetch()` helper in `SpotifyProvider.ts` should handle 429 responses gracefully by reading the `Retry-After` header and retrying. Search input is debounced in the UI to prevent rapid-fire requests.

### Server-Side (OAuth Proxy)

`SpotifyOAuthFunctions.cs` implements its own rate limiting via `X-Device-Token`:
- **1000 requests/day** per device token
- **100 requests/hour** per device token

This protects the OAuth proxy from abuse, independent of Spotify's own rate limits.

## Key Takeaways

- Always check for 429 responses and respect the `Retry-After` header
- Debounce user-triggered requests (search, browse) to stay under limits
- Use batch endpoints to reduce total request count
- Cache immutable data (track metadata, album art) aggressively
- DJ.ai has its own rate limiting layer on top of Spotify's

## DJ.ai Connection

Rate limit handling is critical for a music app where users search frequently and playback state needs periodic polling. The dual rate-limiting approach (Spotify's 429 + DJ.ai's device-token limits) provides defense in depth — Spotify protects itself, DJ.ai protects its backend, and users get uninterrupted playback.

## Further Reading

- [Spotify Rate Limits](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [Spotify API Error Reference](https://developer.spotify.com/documentation/web-api/concepts/api-calls)
- [Exponential Backoff (Google Cloud)](https://cloud.google.com/storage/docs/retry-strategy#exponential-backoff)
