# JSON Web Tokens (JWT)

## What Is a JWT?

A JSON Web Token is a compact, URL-safe way to represent **claims** (statements about an entity) that can be **cryptographically signed** to ensure integrity. JWTs are used for authentication, authorization, and information exchange.

```
eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.        ← Header (base64url)
eyJpc3MiOiJBQkMxMjMiLCJpYXQiOjE3MDAwMDAwMDB9. ← Payload (base64url)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c   ← Signature
```

JWTs are **not encrypted** by default — anyone can decode the header and payload. The signature only proves that the token wasn't tampered with and was issued by the holder of the signing key.

## Topics in This Section

| File | Concept | DJ.ai Use |
|------|---------|-----------|
| [structure-and-signing.md](structure-and-signing.md) | Header.Payload.Signature, algorithms | Apple Music developer tokens (ES256) |
| [validation.md](validation.md) | Verifying signatures, expiry, audience | Apple Music token expiry checks |
| [common-vulnerabilities.md](common-vulnerabilities.md) | alg:none, key confusion, replay | General security awareness |

## DJ.ai Connection

DJ.ai uses JWTs for **Apple Music** integration:

- **Developer Token**: A JWT signed with ES256 (ECDSA P-256) using the team's private key. This proves to Apple that the request comes from a registered developer.
- **Generated in**: `oauth-proxy/Functions/AppleMusicOAuthFunctions.cs` — the backend generates and signs the developer token
- **Cached**: Tokens have a 6-hour expiry and are cached in memory to avoid regenerating on every request

Apple Music is unique among DJ.ai's providers because it requires a **developer-signed JWT** in addition to the user's OAuth token.

## Key Takeaways

- JWTs are **signed**, not encrypted — don't put secrets in the payload
- Always validate the signature, expiry (`exp`), and audience (`aud`) claims
- Use asymmetric algorithms (ES256, RS256) when the verifier shouldn't have the signing key
- DJ.ai uses JWTs specifically for Apple Music developer authentication

## References

- [JWT.io — Introduction](https://jwt.io/introduction)
- [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
