# OAuth Callbacks in React Router

> Handling OAuth redirects in a single-page application — DJ.ai's authorization code flow.

OAuth 2.0 requires a callback URL where the authorization server redirects after the user logs in. In a traditional server app, this is a server endpoint. In a **single-page application** like DJ.ai, React Router handles the redirect client-side — the `OAuthCallback` component at `/oauth/callback` extracts the authorization code and exchanges it for tokens via the backend.

---

## Core Concepts

### The OAuth Redirect Flow

```
1. User clicks "Connect Spotify" in Settings
   └→ App calls POST /oauth/spotify/initiate on the backend

2. Backend returns an auth URL (e.g., https://accounts.spotify.com/authorize?...)
   └→ App opens this URL in an OAuth popup window

3. User logs in and grants permission
   └→ Provider redirects to: http://localhost:5173/oauth/callback?code=ABC&state=XYZ

4. React Router matches /oauth/callback → renders OAuthCallback component

5. OAuthCallback extracts code and state from URL params

6. App calls POST /oauth/spotify/exchange with code + state
   └→ Backend exchanges code for access/refresh tokens (using client secret from Key Vault)

7. App stores tokens in localStorage, closes popup, redirects to main view
```

### The OAuthCallback Component

```typescript
// electron-app/src/components/OAuthCallback.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    async function handleOAuthCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle OAuth errors (user denied, etc.)
      if (error) {
        setStatus('error');
        return;
      }

      if (!code || !state) {
        setStatus('error');
        return;
      }

      try {
        // Determine provider from stored state
        const provider = localStorage.getItem(`oauth_pending_provider`);

        // Exchange code for tokens via backend
        const response = await fetch(
          `${oauthProxyUrl}/oauth/${provider}/exchange`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deviceToken: localStorage.getItem('device-token'),
              code,
              state,
              redirectUri: `${window.location.origin}/oauth/callback`,
            }),
          }
        );

        if (!response.ok) throw new Error('Token exchange failed');

        const tokens = await response.json();

        // Store tokens for the provider
        localStorage.setItem(`${provider}_access_token`, tokens.accessToken);
        localStorage.setItem(`${provider}_refresh_token`, tokens.refreshToken);
        localStorage.setItem(`${provider}_token_expiry`,
          String(Date.now() + tokens.expiresIn * 1000));

        setStatus('success');

        // Navigate back to main app
        navigate('/', { replace: true });
      } catch (err) {
        console.error('OAuth exchange failed:', err);
        setStatus('error');
      }
    }

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="oauth-callback" role="status" aria-live="polite">
      {status === 'processing' && <p>Connecting to your music service...</p>}
      {status === 'success' && <p>Connected! Redirecting...</p>}
      {status === 'error' && <p>Connection failed. Please try again.</p>}
    </div>
  );
}
```

### State Parameter for Security

The `state` parameter is critical for preventing **CSRF attacks**:

1. Backend generates a random `state` value and stores it in Redis
2. State is included in the authorization URL
3. Provider returns it in the callback URL
4. Backend verifies the returned state matches what was stored
5. If it doesn't match, the exchange is rejected

```typescript
// State validation happens on the backend
// Frontend just passes it through
const state = searchParams.get('state');
await fetch(`/oauth/${provider}/exchange`, {
  body: JSON.stringify({ code, state, deviceToken }),
});
// Backend: stateStore.GetAndRemoveStateAsync(state) — validates and removes
```

### Provider Detection

The callback URL is the same for all providers (`/oauth/callback`). DJ.ai determines which provider initiated the flow by:

1. **State lookup** — the backend maps the state parameter to a provider
2. **localStorage fallback** — the app stores `oauth_pending_provider` before opening the popup

### Deep Link Support (Electron)

In the packaged Electron app, OAuth callbacks can arrive via a custom protocol instead of HTTP:

```
djai://oauth/callback?code=ABC&state=XYZ
```

Electron's `main.cjs` handles this deep link and forwards it to the React app:

```javascript
// electron/main.cjs
app.setAsDefaultProtocolClient('djai');
app.on('open-url', (event, url) => {
  // Forward to renderer
  mainWindow.webContents.send('oauth-deep-link', url);
});
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/components/OAuthCallback.tsx`** — The React component that handles the `/oauth/callback` route; extracts `code` and `state`, calls the backend exchange endpoint
- **`electron-app/src/App.tsx`** — Defines the `/oauth/callback` route in the router
- **`electron-app/electron/main.cjs`** — Opens OAuth popup windows; handles `djai://` deep links for packaged app
- **`electron-app/electron/preload.cjs`** — Exposes `oauthDeepLink.onCallback()` for deep link handling
- **`oauth-proxy/Functions/SpotifyOAuthFunctions.cs`** — Backend `ExchangeSpotifyCode` validates state, exchanges code for tokens
- **`oauth-proxy/Services/RedisStateStoreService.cs`** — Stores and validates OAuth state parameters

---

## 🎯 Key Takeaways

- OAuth callbacks in SPAs are handled **client-side** by React Router — no server endpoint needed
- The **`state` parameter** prevents CSRF attacks — always validate it on the backend
- DJ.ai's `OAuthCallback` component runs the exchange **once** via `useEffect` with `[]` deps
- After exchange, tokens are stored in **localStorage** and the app navigates to `/` with `replace: true`
- **Deep links** (`djai://`) handle OAuth callbacks in the packaged Electron app
- The same `/oauth/callback` route works for all providers — provider is determined from the state parameter

---

## 📖 Resources

- [useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params) — Reading query parameters
- [OAuth 2.0 for Browser-Based Apps (RFC)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps) — Best practices for SPAs
- [CSRF Prevention with State Parameter](https://auth0.com/docs/secure/attack-protection/state-parameters) — Why state matters
