# OAuth 2.0 Framework

## What Is OAuth?

OAuth 2.0 is an **authorization framework** that lets users grant third-party applications limited access to their accounts on another service — without sharing their password. When you click "Sign in with Google" or "Connect Spotify," that's OAuth.

OAuth defines four roles:

| Role | In DJ.ai |
|------|----------|
| **Resource Owner** | The user (you) |
| **Client** | The DJ.ai Electron app |
| **Authorization Server** | Google, Spotify, or Apple's login page |
| **Resource Server** | YouTube Data API, Spotify Web API, Apple Music API |

## Why DJ.ai Needs OAuth

DJ.ai connects to multiple music streaming platforms. Each requires user authorization to access personal data (playlists, listening history, playback controls). OAuth enables this without ever seeing the user's password.

**Critical constraint**: DJ.ai is a desktop app — a **public client** in OAuth terminology. It cannot securely store client secrets because users can inspect the app binary. This is why DJ.ai uses a backend OAuth proxy (`oauth-proxy/`) to handle token exchange where the client secret lives safely in Azure Key Vault.

## Topics in This Section

| File | Concept |
|------|---------|
| [authorization-code-flow.md](authorization-code-flow.md) | The core OAuth flow DJ.ai uses |
| [pkce.md](pkce.md) | Proof Key for Code Exchange — extra security for public clients |
| [token-refresh.md](token-refresh.md) | How access tokens are renewed without re-authentication |
| [state-parameter.md](state-parameter.md) | CSRF protection during OAuth |
| [client-secret-protection.md](client-secret-protection.md) | Why secrets live on the backend |

## DJ.ai Connection

The OAuth flow spans both the frontend and backend:

- **Frontend**: `electron-app/src/providers/SpotifyProvider.ts`, `YouTubeMusicProvider.ts`, `AppleMusicProvider.ts` — initiate flows, store tokens, make API calls
- **Backend**: `oauth-proxy/Functions/SpotifyOAuthFunctions.cs`, `YouTubeOAuthFunctions.cs`, `AppleMusicOAuthFunctions.cs` — exchange codes for tokens using the client secret
- **Callback handler**: `electron-app/src/components/OAuthCallback.tsx` — routes the authorization code to the correct provider

## Key Takeaways

- OAuth is **authorization** (access to resources), not **authentication** (proving identity)
- Desktop apps are public clients — they need a backend proxy for secret operations
- The entire DJ.ai backend exists solely for OAuth token operations

## References

- [RFC 6749 — The OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [OAuth.net](https://oauth.net/2/) — Community resources and guides
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
