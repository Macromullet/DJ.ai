# State Parameter — CSRF Protection in OAuth

## The Problem: Cross-Site Request Forgery

Without a state parameter, an attacker can trick a user into completing an OAuth flow that links the **attacker's** account:

```
1. Attacker starts OAuth flow, gets authorization code
2. Attacker crafts URL: http://localhost:5173/oauth/callback?code=ATTACKERS_CODE
3. Attacker tricks victim into clicking the link
4. Victim's app exchanges the code → gets attacker's tokens
5. Victim is now using attacker's music account (attacker can see their activity)
```

## The Solution: State Parameter

The state parameter is a **random, unguessable value** that binds the OAuth request to the user's session:

```
1. App generates random state: "a1b2c3d4e5f6"
2. App stores state in localStorage: djai_oauth_state_a1b2c3d4e5f6 → { provider: "spotify" }
3. App includes state in auth URL: &state=a1b2c3d4e5f6
4. User logs in, provider redirects: /callback?code=XYZ&state=a1b2c3d4e5f6
5. App checks: do I have a stored state matching "a1b2c3d4e5f6"?
   - Yes → This is MY flow, proceed with exchange
   - No  → This is forged, reject
6. App deletes the stored state (single-use)
```

## DJ.ai Implementation

DJ.ai implements state parameter validation on **both** the frontend and backend:

### Frontend (Callback Handler)

```typescript
// electron-app/src/components/OAuthCallback.tsx
// On callback, extract state from URL query params
// Look up stored state: localStorage.getItem(`djai_oauth_state_${state}`)
// If found → determine provider, proceed with token exchange
// If not found → fallback to pending provider check
```

### Backend (State Store)

| File | Role |
|------|------|
| `oauth-proxy/Services/IStateStoreService.cs` | Interface: `StoreStateAsync()` and `ConsumeStateAsync()` (atomic read+delete) |
| `oauth-proxy/Services/RedisStateStoreService.cs` | Redis-backed store with 10-minute TTL, in-memory fallback |
| `oauth-proxy/Services/ValidationService.cs` | `IsValidOAuthState()` — validates state format |

### Key Design Decisions

- **Atomic consume**: `ConsumeStateAsync` reads and deletes in one operation — prevents replay attacks
- **TTL expiry**: States auto-expire after 10 minutes — if the user doesn't complete login, the state is cleaned up
- **Redis + fallback**: Production uses Redis for distributed state; falls back to in-memory for local development

## Security Properties

| Property | How |
|----------|-----|
| **Unpredictable** | Generated with cryptographically secure random bytes |
| **Single-use** | Consumed (deleted) on first use |
| **Time-limited** | 10-minute TTL in Redis |
| **Bound to session** | Stored in localStorage, tied to the browser session |

## Key Takeaways

- The state parameter prevents CSRF by binding the OAuth flow to the user's session
- Always use cryptographically random values (not timestamps or sequential IDs)
- State must be **single-use** — consume it after validation
- DJ.ai stores state both client-side (localStorage) and server-side (Redis) for defense in depth

## References

- [RFC 6749 §10.12 — Cross-Site Request Forgery](https://datatracker.ietf.org/doc/html/rfc6749#section-10.12)
- [Auth0 — State Parameters](https://auth0.com/docs/secure/attack-protection/state-parameters)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
