# OAuth-Only Middle Tier

## The Concept

Most web applications that use third-party APIs route **all requests through their backend** — the client calls the backend, which calls the provider API. This is the "full API proxy" pattern. DJ.ai deliberately rejects this approach.

Instead, DJ.ai's backend handles **only OAuth token operations** — initiating auth, exchanging codes for tokens, and refreshing expired tokens. All actual music API calls (search, playback, recommendations) go **directly from the Electron app to the provider**.

### Full Proxy vs OAuth-Only

```
Full API Proxy:
  Client → Backend → Spotify API → Backend → Client
  (Every API call costs backend compute)

OAuth-Only (DJ.ai):
  Client → Backend → Client (token exchange only)
  Client → Spotify API → Client (direct, fast, free)
```

## Why This Architecture?

### 1. Performance

Direct API calls eliminate a network hop. The client talks to Spotify/Apple Music directly instead of routing through an intermediary:

```
Full proxy:  Client → Azure → Spotify → Azure → Client  (~200ms added)
OAuth-only:  Client → Spotify → Client                    (direct, minimal latency)
```

### 2. Cost

Azure Functions charge per execution and per GB-second. With a full proxy, every search query, track fetch, and recommendation costs compute. With OAuth-only, the backend handles ~3 requests per user session (initiate, exchange, occasional refresh) instead of hundreds.

### 3. Simplicity

The backend is just three endpoints per provider. No need to mirror every Spotify/Apple Music API endpoint, handle pagination, or manage streaming responses.

### 4. Security Is Preserved

The reason backends exist in OAuth is to protect **client secrets** — the private key that proves your app's identity to the provider. DJ.ai's backend still does this:

```
1. User clicks "Connect Spotify"
2. App calls /oauth/spotify/initiate
3. Backend builds auth URL using client secret (from Key Vault)
4. User logs in, gets authorization code
5. App calls /oauth/spotify/exchange with the code
6. Backend exchanges code for tokens using client secret
7. App stores tokens in localStorage
8. App calls Spotify API directly using access token
```

The client secret never leaves the backend. The access token (which is safe for the client to hold) does all the work.

## DJ.ai Connection

This is the **core architectural decision** in DJ.ai. The OAuth proxy in `oauth-proxy/Functions/` implements three endpoints per provider: `initiate`, `exchange`, and `refresh`. The frontend providers in `electron-app/src/providers/` (like `SpotifyProvider.ts`) make direct API calls using stored OAuth tokens. Understanding this pattern is essential before reading any other architecture documentation.

## Key Takeaways

- Backend handles only token operations — never proxies API requests
- Direct client→provider calls are faster, cheaper, and simpler
- Client secrets stay protected in Key Vault; access tokens live on the client
- This pattern is ideal when the client can safely make API calls (desktop apps, SPAs)

## Further Reading

- [RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [Auth0: SPA + API Architecture](https://auth0.com/docs/get-started/architecture-scenarios/spa-api)
- [OAuth.net: OAuth for Browser-Based Apps](https://oauth.net/2/browser-based-apps/)
