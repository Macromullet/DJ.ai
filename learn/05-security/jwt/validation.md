# JWT Validation

## Why Validation Matters

Receiving a JWT is not enough — you must **verify** it before trusting any of its claims. A JWT without validation is just a JSON blob that anyone could have crafted.

## The Validation Checklist

### 1. Verify the Signature

The most critical step. Proves the token was issued by the expected party and hasn't been tampered with.

```
Receive token → Decode header → Get algorithm and key ID
→ Fetch public key (from JWKS endpoint or local store)
→ Verify: SIGN(header.payload, key) === signature?
→ YES: Token is authentic    NO: Reject immediately
```

**Never skip signature verification.** The `alg: "none"` attack exists precisely to trick validators into skipping this step (see [common-vulnerabilities.md](common-vulnerabilities.md)).

### 2. Check Expiration (`exp`)

```javascript
const payload = decodeJWT(token);
if (payload.exp < Math.floor(Date.now() / 1000)) {
  throw new Error('Token expired');
}
```

Allow a small clock skew tolerance (30-60 seconds) to account for time differences between servers.

### 3. Validate Audience (`aud`)

The `aud` claim specifies who the token is intended for. If your service receives a token meant for a different service, reject it.

```javascript
if (payload.aud !== 'my-service-id') {
  throw new Error('Token not intended for this service');
}
```

### 4. Validate Issuer (`iss`)

Confirm the token was issued by a trusted authority:

```javascript
if (payload.iss !== 'expected-issuer') {
  throw new Error('Unknown token issuer');
}
```

### 5. Check "Not Before" (`nbf`)

If present, the token shouldn't be used before this timestamp.

## DJ.ai Connection

DJ.ai handles JWT validation for Apple Music developer tokens:

| Aspect | Implementation |
|--------|---------------|
| **Token generation** | `oauth-proxy/Functions/AppleMusicOAuthFunctions.cs` — signs with ES256 |
| **Expiry** | 6-hour lifetime (`exp` claim) |
| **Caching** | Tokens cached in memory; regenerated when expired |
| **Validation by Apple** | Apple validates the signature using the public key registered in App Store Connect |

### Token Lifecycle

```
1. Client requests Apple Music access
2. Backend checks: is cached developer token still valid?
   - Yes (exp > now) → Return cached token
   - No → Generate new JWT, sign with ES256, cache it, return
3. Client includes token in Apple Music API requests
4. Apple validates signature against registered public key
5. Token expires after 6 hours → repeat from step 1
```

## Common Validation Mistakes

| Mistake | Risk |
|---------|------|
| Not verifying signature | Anyone can forge tokens |
| Not checking `exp` | Stolen tokens work forever |
| Not validating `aud` | Token confusion attacks |
| Trusting `alg` header blindly | Algorithm substitution attacks |
| Hardcoding public keys | Can't rotate keys |

## Key Takeaways

- **Always verify the signature** — it's the foundation of JWT security
- Check `exp`, `aud`, `iss`, and `nbf` claims
- Never trust the `alg` header from the token — use a server-side configuration
- Cache tokens to avoid regeneration overhead, but respect expiry
- Use JWKS (JSON Web Key Sets) endpoints for public key distribution when possible

## References

- [Auth0 — Validate JSON Web Tokens](https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens)
- [RFC 7519 §7.2 — Validating a JWT](https://datatracker.ietf.org/doc/html/rfc7519#section-7.2)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
