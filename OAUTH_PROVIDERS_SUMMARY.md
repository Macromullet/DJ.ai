# OAuth Provider Summary

Overview of OAuth provider implementations in the DJ.ai OAuth proxy.

## Provider Status

| Provider | Status | Auth Type | Endpoints |
|----------|--------|-----------|-----------|
| YouTube Music | ✅ Fully working | OAuth 2.0 | initiate, exchange, refresh |
| Spotify | ✅ Implemented | OAuth 2.0 | initiate, exchange, refresh |
| Apple Music | ✅ Implemented | Developer Token (ES256 JWT) | initiate, developer-token, validate |

## YouTube Music (Google)

**File:** `oauth-proxy/Functions/YouTubeOAuthFunctions.cs`

- Standard OAuth 2.0 Authorization Code Flow
- Scopes: `https://www.googleapis.com/auth/youtube.readonly`
- Tokens expire in 1 hour, refresh via `/refresh` endpoint
- Credentials: Google Cloud Console → OAuth 2.0 Client ID

## Spotify

**File:** `oauth-proxy/Functions/SpotifyOAuthFunctions.cs`

- OAuth 2.0 with Basic authentication (client_id:client_secret)
- Refresh tokens are long-lived (may not be renewed on refresh)
- Requires Spotify Premium for streaming/playback control

**Scopes:**
`user-read-private`, `user-read-email`, `user-library-read`, `user-top-read`, `playlist-read-private`, `playlist-read-collaborative`, `streaming`, `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`

## Apple Music

**File:** `oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`

- Uses Developer Token (JWT signed with ES256) + Music User Token
- Different from standard OAuth 2.0 — no client_id/client_secret
- Developer Token valid for up to 6 months
- Requires Apple Developer Account ($99/year), Team ID, Key ID, Private Key (.p8)
- See [APPLE_MUSIC_JWT_SIGNING.md](oauth-proxy/APPLE_MUSIC_JWT_SIGNING.md) for implementation details

## API Comparison

| Feature | YouTube | Spotify | Apple Music |
|---------|---------|---------|-------------|
| Auth Type | OAuth 2.0 | OAuth 2.0 | Developer Token + User Token |
| Client Secret | Yes | Yes | No (uses private key) |
| Refresh Tokens | Yes | Yes | N/A (user token different) |
| Expires | 1 hour | 1 hour | 6 months (dev token) |
| Signing | N/A | N/A | ES256 JWT |

## Configuration

Secrets are managed via `setup.ps1`:
- **Local:** `.\setup.ps1 --local` → stores in `dotnet user-secrets`
- **Cloud:** `.\setup.ps1 --cloud` → pushes to Azure Key Vault

See [docs/GETTING_OAUTH_CREDENTIALS.md](docs/GETTING_OAUTH_CREDENTIALS.md) for credential setup instructions.

## Security

All providers share the same security model:
- Device token validation (X-Device-Token header)
- Rate limiting via Redis (atomic Lua scripts)
- State validation (CSRF protection)
- Client secrets in Azure Key Vault (Managed Identity + RBAC)
- URI allowlist for redirect validation
