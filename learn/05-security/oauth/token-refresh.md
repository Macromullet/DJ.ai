# Token Refresh

## What Are Refresh Tokens?

Access tokens are intentionally **short-lived** (typically 1 hour). When they expire, the app needs a new one — but re-prompting the user to log in every hour would be terrible UX. **Refresh tokens** solve this by allowing the app to silently obtain new access tokens.

```
Access Token:  Short-lived (1 hour), used for API calls
Refresh Token: Long-lived (days/months), used ONLY to get new access tokens
```

## The Refresh Flow

```
┌──────────┐                              ┌──────────────┐
│  DJ.ai   │  POST /oauth/spotify/refresh │  OAuth Proxy │
│  Client  │ ────────────────────────────►│  (Backend)   │
│          │  { refresh_token: "abc..." } │              │
│          │                              │  Adds client │
│          │  { access_token: "new...",   │  secret from │
│          │    expires_in: 3600 }        │  Key Vault   │
│          │ ◄────────────────────────────│              │
└──────────┘                              └──────────────┘
```

### Proactive vs. Reactive Refresh

| Strategy | Description | DJ.ai Approach |
|----------|-------------|----------------|
| **Reactive** | Wait for a 401, then refresh | ❌ Causes visible errors |
| **Proactive** | Check expiry before each request, refresh early | ✅ DJ.ai checks if expiry < 5 minutes |

## DJ.ai Source Files

| File | Role |
|------|------|
| `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` | `/refresh` endpoint — adds client secret, calls provider's token endpoint |
| `electron-app/src/providers/SpotifyProvider.ts` | Checks token expiry, calls `/refresh` proactively before API requests |
| `electron-app/src/providers/AppleMusicProvider.ts` | Token expiry checking and refresh logic |
| `oauth-proxy/Models/OAuthModels.cs` | `OAuthRefreshRequest` DTO with refresh_token field |

### Token Lifecycle in DJ.ai

```
1. User connects Spotify → access_token + refresh_token stored in localStorage
2. App checks: is access_token expiring within 5 minutes?
   - No  → Use current access_token for API call
   - Yes → Call /oauth/spotify/refresh with refresh_token
           → Store new access_token (and new refresh_token if rotated)
3. Refresh token expired or revoked?
   → Clear tokens, prompt user to reconnect
```

## Security Considerations

- **Refresh tokens are high-value targets** — if stolen, an attacker gets indefinite access
- **Token rotation**: Some providers issue a new refresh token with each use (old one is invalidated)
- **Storage**: DJ.ai stores tokens in localStorage — acceptable for desktop apps but not for web apps
- **Backend refresh**: The refresh goes through the backend proxy because it requires the client secret

## Key Takeaways

- Access tokens expire fast (1 hour); refresh tokens last much longer
- Always refresh **proactively** before expiry to avoid user-visible errors
- The refresh endpoint needs the client secret — another reason for the backend proxy
- Handle refresh token rotation (save the new refresh token when the provider sends one)
- If the refresh token is revoked, gracefully prompt re-authentication

## References

- [RFC 6749 §6 — Refreshing an Access Token](https://datatracker.ietf.org/doc/html/rfc6749#section-6)
- [Auth0 — Refresh Tokens](https://auth0.com/docs/secure/tokens/refresh-tokens)
- [OWASP Token Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
