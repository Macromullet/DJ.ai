# PKCE — Proof Key for Code Exchange

## What Is PKCE?

PKCE (pronounced "pixy") is an extension to the Authorization Code Flow that protects against **authorization code interception attacks**. It was originally designed for mobile and native apps (public clients) but is now recommended for **all** OAuth clients, including web apps.

## How It Works

PKCE adds a cryptographic challenge to the OAuth flow:

```
1. Client generates a random string:         code_verifier  (43-128 chars)
2. Client hashes it:                          code_challenge = SHA256(code_verifier)
3. Client sends code_challenge with auth request
4. Auth server stores the challenge
5. User logs in, gets authorization code
6. Client sends code + code_verifier to token endpoint
7. Auth server hashes the verifier, compares to stored challenge
8. Match? → Issue tokens. No match? → Reject.
```

### The Key Insight

Even if an attacker intercepts the authorization code (via a malicious app registered for the same redirect URI), they can't exchange it without the `code_verifier` — which never left the original client.

```javascript
// Generating PKCE values (conceptual)
const code_verifier = generateRandomString(64);
const code_challenge = base64url(sha256(code_verifier));

// Authorization request includes:
// &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
// &code_challenge_method=S256

// Token exchange includes:
// &code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

## DJ.ai Connection

**Current status**: DJ.ai does not yet implement PKCE in its OAuth flows. The codebase relies on:
- **State parameter** for CSRF protection (`oauth-proxy/Services/RedisStateStoreService.cs`)
- **Device token** rate limiting to prevent brute-force code guessing (`oauth-proxy/Services/RedisDeviceAuthService.cs`)
- **Backend proxy** pattern where the client secret adds an additional verification layer

**Why PKCE should be added**: As a desktop app (public client), DJ.ai would benefit from PKCE as defense-in-depth. Even though the backend proxy holds the client secret, PKCE protects against code interception at the OS level (malicious apps claiming the same custom URI scheme). Spotify and Google both support PKCE.

**Where it would go**:
- `electron-app/src/providers/SpotifyProvider.ts` — generate `code_verifier`, send `code_challenge` with initiate request
- `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` — pass `code_verifier` during token exchange
- `oauth-proxy/Services/ValidationService.cs` — validate PKCE parameters

## Key Takeaways

- PKCE prevents authorization code interception — critical for public clients
- Uses SHA-256 hashing: the verifier proves possession without exposing the challenge
- **OAuth 2.1 draft makes PKCE mandatory** for all clients, not just public ones
- DJ.ai should implement PKCE as an additional security layer alongside its backend proxy

## References

- [RFC 7636 — Proof Key for Code Exchange](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth.net — PKCE](https://oauth.net/2/pkce/)
- [OWASP OAuth Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_Cheat_Sheet.html)
