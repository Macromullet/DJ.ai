# Spotify OAuth 2.0

## Concept

Spotify uses standard **OAuth 2.0 Authorization Code Flow** for user authentication. DJ.ai uses the server-side variant (not PKCE) because the backend securely stores the client secret in Azure Key Vault and handles the token exchange.

The flow produces an **access token** (for API calls, expires in 1 hour) and a **refresh token** (for obtaining new access tokens without re-authentication).

## The OAuth Flow

```
1. User clicks "Connect Spotify"
2. App calls POST /oauth/spotify/initiate
   → Backend builds auth URL with client_id, redirect_uri, scopes, state
   → Returns authorization URL
3. App opens auth URL in popup → User logs into Spotify
4. Spotify redirects to callback with ?code=...&state=...
5. App calls POST /oauth/spotify/exchange with code
   → Backend exchanges code for tokens (using client_secret from Key Vault)
   → Returns access_token + refresh_token
6. App stores tokens in localStorage
7. App makes API calls directly to Spotify using access_token
8. Token expires → App calls POST /oauth/spotify/refresh
   → Backend uses refresh_token + client_secret to get new access_token
```

## How DJ.ai Implements OAuth

### Backend: `SpotifyOAuthFunctions.cs`

Three Azure Function endpoints:

```csharp
// 1. Build the authorization URL
[Function("SpotifyOAuthInitiate")]
POST /oauth/spotify/initiate
→ Returns: { authUrl: "https://accounts.spotify.com/authorize?..." }

// 2. Exchange authorization code for tokens
[Function("SpotifyOAuthExchange")]
POST /oauth/spotify/exchange
→ Body: { code, redirectUri }
→ Returns: { accessToken, refreshToken, expiresIn }

// 3. Refresh an expired access token
[Function("SpotifyOAuthRefresh")]
POST /oauth/spotify/refresh
→ Body: { refreshToken }
→ Returns: { accessToken, expiresIn }
```

### Frontend: `SpotifyProvider.ts`

```typescript
// Auto-refresh with 5-minute buffer
private async ensureValidToken(): Promise<void> {
  const expiresAt = this.tokenExpiresAt;
  const buffer = 5 * 60 * 1000; // 5 minutes
  if (Date.now() > expiresAt - buffer) {
    await this.refreshAccessToken();
  }
}
```

### Security Measures

- **State parameter** — CSRF protection via random state stored in distributed cache (Redis)
- **Device token** — `X-Device-Token` header for rate limiting (1000/day, 100/hour)
- **Redirect URI validation** — Only whitelisted callback URLs accepted
- **Client secret** — Never sent to the client; fetched from Azure Key Vault on the backend

## Scopes

DJ.ai requests these scopes:

| Scope | Purpose |
|-------|---------|
| `user-read-private` | Account details |
| `user-read-email` | Email address |
| `user-library-read` | Saved tracks/albums |
| `user-top-read` | Top tracks/artists |
| `streaming` | Web Playback SDK |
| `user-read-playback-state` | Current playback info |
| `user-modify-playback-state` | Control playback |
| `playlist-read-private` | Private playlists |
| `playlist-read-collaborative` | Shared playlists |

## Key Takeaways

- Standard OAuth 2.0 authorization code flow (the most conventional of DJ.ai's provider auth flows)
- Client secret is protected on the backend — only the backend performs token exchange and refresh
- Automatic token refresh with a 5-minute buffer prevents playback interruption
- State-based CSRF protection prevents authorization code interception attacks

## DJ.ai Connection

Spotify's OAuth implementation in DJ.ai exemplifies the "OAuth-only middle tier" pattern: the backend handles three endpoints (initiate, exchange, refresh) and nothing more. All actual Spotify API calls go directly from `SpotifyProvider.ts` to `api.spotify.com`. The `SpotifyOAuthFunctions.cs` patterns are reused by YouTube and could be templated for any future OAuth 2.0 provider.

## Further Reading

- [Spotify Authorization Code Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Spotify Scopes Reference](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
