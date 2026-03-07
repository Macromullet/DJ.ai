# YouTube / Google OAuth 2.0

## Concept

YouTube uses Google's OAuth 2.0 implementation for user authentication. The flow is standard authorization code grant — nearly identical to Spotify's — but with Google-specific scopes for YouTube data access. DJ.ai's backend handles the token exchange and refresh, keeping Google's client secret protected in Azure Key Vault.

## OAuth Scopes for YouTube

```
https://www.googleapis.com/auth/youtube.readonly     // Read-only access to account
https://www.googleapis.com/auth/youtube               // Full YouTube access
```

The `youtube.readonly` scope is sufficient for DJ.ai's use case (search, recommendations, library browsing). The full `youtube` scope would be needed for playlist creation or video management.

## The OAuth Flow

```
1. User clicks "Connect YouTube"
2. App calls POST /oauth/youtube/initiate
   → Backend builds Google auth URL with client_id, scopes, state, redirect_uri
   → Returns: https://accounts.google.com/o/oauth2/v2/auth?...
3. App opens auth URL → User logs into Google account
4. Google redirects to callback with ?code=...&state=...
5. App calls POST /oauth/youtube/exchange
   → Backend exchanges code at https://oauth2.googleapis.com/token
   → Returns access_token + refresh_token
6. App stores tokens in localStorage
7. App makes YouTube Data API calls directly with access_token
8. Token expires → POST /oauth/youtube/refresh
```

## How DJ.ai Implements YouTube OAuth

### Backend: `YouTubeOAuthFunctions.cs`

Three Azure Function endpoints following the same pattern as Spotify:

```csharp
[Function("YouTubeOAuthInitiate")]
POST /oauth/youtube/initiate
→ Returns: { authUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }

[Function("YouTubeOAuthExchange")]
POST /oauth/youtube/exchange
→ Body: { code, redirectUri }
→ POSTs to: https://oauth2.googleapis.com/token
→ Returns: { accessToken, refreshToken, expiresIn }

[Function("YouTubeOAuthRefresh")]
POST /oauth/youtube/refresh
→ Body: { refreshToken }
→ Returns: { accessToken, expiresIn }
```

### Frontend: `YouTubeMusicProvider.ts`

The provider stores OAuth tokens in `localStorage` and refreshes them when expired. It also supports a fallback to API key authentication for read-only access:

```typescript
// Dual auth: OAuth token preferred, API key as fallback
private getAuthParam(): string {
  if (this.accessToken) {
    return ''; // Token sent in Authorization header
  }
  return `&key=${this.apiKey}`;
}
```

### Security Measures

Same as Spotify's implementation:
- **State parameter** — CSRF protection via Redis-backed state store
- **Device token** — Rate limiting via `X-Device-Token` header
- **Client secret** — Stored in Azure Key Vault, never exposed to client
- **Redirect URI validation** — Whitelist enforcement

## Google OAuth vs. Other Providers

| Aspect | Google/YouTube | Spotify | Apple Music |
|--------|---------------|---------|-------------|
| Auth URL | `accounts.google.com/o/oauth2/v2/auth` | `accounts.spotify.com/authorize` | N/A (MusicKit JS) |
| Token URL | `oauth2.googleapis.com/token` | `accounts.spotify.com/api/token` | N/A |
| Token lifetime | 1 hour | 1 hour | Managed by MusicKit |
| Refresh token | Standard | Standard | Automatic |
| Scope format | Full URL | Short string | N/A |

## Key Takeaways

- Google OAuth 2.0 is the most standard implementation — virtually identical to Spotify's flow
- Scopes are full URLs (`https://www.googleapis.com/auth/youtube.readonly`) unlike Spotify's short names
- Access tokens last 1 hour; refresh tokens don't expire unless revoked
- The dual auth approach (OAuth + API key) provides graceful degradation

## DJ.ai Connection

YouTube OAuth in `YouTubeOAuthFunctions.cs` follows the exact same pattern as `SpotifyOAuthFunctions.cs` — three endpoints, same security measures, same architecture. This consistency validates the OAuth-only middle tier design: adding a new OAuth 2.0 provider is mostly copy-paste with provider-specific URLs and scopes.

## Further Reading

- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/youtube/v3/guides/authentication)
- [Google Identity: Using OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [YouTube Scopes Reference](https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps#identify-access-scopes)
