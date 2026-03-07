# JWT Common Vulnerabilities

## 1. Algorithm "None" Attack

The JWT spec allows `"alg": "none"` for unsigned tokens. If a server naively trusts the `alg` header, an attacker can:

```json
// Attacker crafts:
{ "alg": "none", "typ": "JWT" }
.
{ "sub": "admin", "role": "superuser" }
.
  ← Empty signature
```

If the server reads `alg: none` and skips signature verification, the forged token is accepted.

**Defense**: Never allow `alg: none`. Validate the algorithm against a server-side allowlist:

```javascript
// ✅ Server decides the algorithm, not the token
const ALLOWED_ALGORITHMS = ['ES256', 'RS256'];
jwt.verify(token, publicKey, { algorithms: ALLOWED_ALGORITHMS });
```

## 2. Algorithm Confusion (Key Confusion)

If a server is configured to accept both HMAC (symmetric) and RSA (asymmetric) tokens:

```
Normal flow:
  Token signed with RSA private key → Server verifies with RSA public key

Attack:
  Attacker gets the RSA public key (it's public!)
  Attacker signs a new token with HMAC using the public key as the HMAC secret
  Attacker sets alg: "HS256"
  Server reads alg: HS256 → verifies with "secret" → uses the RSA public key
  HMAC(payload, public_key) === signature ← MATCHES! Token accepted.
```

**Defense**: Use separate code paths for symmetric and asymmetric algorithms. Never let the token's `alg` header choose the verification key type.

## 3. Replay Attacks

A valid, stolen token can be reused until it expires:

```
Victim authenticates → Gets JWT → Attacker intercepts JWT
→ Attacker replays the same JWT → Server accepts it (signature is valid)
```

**Defenses**:
- Short expiration times (`exp`)
- One-time-use tokens with `jti` (JWT ID) claim and server-side tracking
- Token binding (tie token to client IP or TLS session)

## 4. Token Sidejacking

Tokens transmitted without TLS can be intercepted:

**Defense**: Always use HTTPS. Set `Secure` flag on cookies that carry JWTs.

## 5. Weak Signing Secrets

HMAC-signed tokens (HS256) with weak secrets can be brute-forced:

```bash
# Tools like jwt-cracker can brute-force weak HMAC secrets
jwt-cracker "eyJhbGci..." --max-length 6 --alphabet abcdefghijklmnop
```

**Defense**: Use keys with at least 256 bits of entropy. Better yet, use asymmetric algorithms (RS256, ES256).

## 6. Sensitive Data in Payload

JWTs are Base64URL-encoded, **not encrypted**. Anyone can decode the payload:

```bash
echo "eyJzdWIiOiIxMjM0NTY3ODkwIn0" | base64 -d
# → {"sub":"1234567890"}
```

**Defense**: Never put secrets, passwords, or PII in JWT payloads. Use JWE (JSON Web Encryption) if payload confidentiality is needed.

## DJ.ai Relevance

DJ.ai generates Apple Music developer tokens using ES256 — an asymmetric algorithm that avoids the HMAC key confusion vulnerability. The private key stays in Azure Key Vault, and tokens have a 6-hour expiry limiting replay window. DJ.ai does not accept incoming JWTs from untrusted sources, reducing its JWT attack surface to token generation only.

## Key Takeaways

- **Never trust the `alg` header** — use a server-side algorithm allowlist
- **Block `alg: none`** — it's the most common JWT vulnerability
- **Use asymmetric algorithms** (ES256, RS256) to avoid key confusion
- **Keep tokens short-lived** — limits the window for replay attacks
- **Never put secrets in JWT payloads** — they're readable by anyone

## References

- [PortSwigger — JWT Attacks](https://portswigger.net/web-security/jwt)
- [Auth0 — JWT Vulnerabilities](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
