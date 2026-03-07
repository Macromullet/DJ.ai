# Authorization Code Flow

## What Is It?

The Authorization Code Flow is the most secure OAuth 2.0 grant type for server-side and native applications. It exchanges a short-lived **authorization code** for long-lived **access and refresh tokens**, and the exchange happens server-side where the client secret is safe.

## How the Flow Works

```
┌──────────┐     1. Build auth URL      ┌──────────────┐
│  DJ.ai   │ ─────────────────────────► │  OAuth Proxy │
│  Client  │ ◄───────────────────────── │  (Backend)   │
│          │     2. Return auth URL      └──────────────┘
│          │
│          │     3. Open auth URL        ┌──────────────┐
│          │ ─────────────────────────► │  Auth Server │
│          │                             │  (Spotify,   │
│          │     4. User logs in         │   Apple)     │
│          │                             └──────┬───────┘
│          │     5. Redirect with code          │
│          │ ◄──────────────────────────────────┘
│          │
│          │     6. Send code            ┌──────────────┐
│          │ ─────────────────────────► │  OAuth Proxy │
│          │ ◄───────────────────────── │  (exchanges  │
│          │     7. Return tokens        │   with secret)│
└──────────┘                             └──────────────┘
```

### Step-by-Step in DJ.ai

1. **Initiate**: User clicks "Connect Spotify" → app calls `/oauth/spotify/initiate`
2. **Build URL**: Backend reads client ID/secret from Key Vault, builds authorization URL with scopes, redirect URI, and state parameter
3. **Redirect**: App opens the URL in an OAuth popup window (`electron-app/electron/main.cjs`)
4. **Login**: User authenticates with the music provider
5. **Callback**: Provider redirects to `http://localhost:5173/oauth/callback?code=ABC&state=XYZ`
6. **Exchange**: `OAuthCallback.tsx` catches the redirect, app calls `/oauth/spotify/exchange` with the code
7. **Tokens**: Backend exchanges the code + client secret for access/refresh tokens, returns them to the client

## DJ.ai Source Files

| File | Role |
|------|------|
| `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` | `/initiate` builds auth URL, `/exchange` trades code for tokens |
| `electron-app/src/components/OAuthCallback.tsx` | Catches the redirect, extracts code and state, routes to provider |
| `electron-app/src/providers/SpotifyProvider.ts` | Calls initiate/exchange endpoints, stores tokens in localStorage |
| `oauth-proxy/Models/OAuthModels.cs` | DTOs: `OAuthInitiateRequest`, `OAuthExchangeRequest`, `OAuthTokenResponse` |

## Why Not Use Implicit Flow?

The older Implicit Flow returned tokens directly in the URL fragment — visible in browser history and server logs. The Authorization Code Flow keeps tokens off the URL entirely. The code is single-use and short-lived (typically 10 minutes).

## Key Takeaways

- The authorization code is **not** a token — it's a one-time ticket exchanged for tokens
- The exchange happens on the **backend** where the client secret is safe
- The redirect URI must **exactly match** what's registered with the provider
- The state parameter prevents CSRF (see [state-parameter.md](state-parameter.md))

## References

- [RFC 6749 §4.1 — Authorization Code Grant](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1)
- [Auth0 — Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
