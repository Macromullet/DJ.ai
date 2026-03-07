# JWT Structure and Signing

## The Three Parts

Every JWT has three Base64URL-encoded parts separated by dots:

```
HEADER.PAYLOAD.SIGNATURE
```

### 1. Header

Declares the token type and signing algorithm:

```json
{
  "alg": "ES256",    // Signing algorithm
  "typ": "JWT",      // Token type
  "kid": "ABC123"    // Key ID (which key to use for verification)
}
```

### 2. Payload (Claims)

Contains the actual data — called **claims**:

```json
{
  "iss": "TEAM_ID",           // Issuer (who created the token)
  "iat": 1700000000,          // Issued At (Unix timestamp)
  "exp": 1700021600,          // Expiration (6 hours later)
  "aud": "appstoreconnect",   // Audience (intended recipient)
  "sub": "com.djai.app"       // Subject (what entity the token represents)
}
```

**Standard claims**: `iss`, `sub`, `aud`, `exp`, `nbf` (not before), `iat`, `jti` (unique ID)

### 3. Signature

Proves the token hasn't been tampered with:

```
SIGNATURE = SIGN(
  base64url(header) + "." + base64url(payload),
  signing_key
)
```

## Signing Algorithms

| Algorithm | Type | Key | Use Case |
|-----------|------|-----|----------|
| **HS256** | Symmetric (HMAC) | Shared secret | Server-to-server (same party signs and verifies) |
| **RS256** | Asymmetric (RSA) | Private/public keypair | Third-party verification (anyone can verify) |
| **ES256** | Asymmetric (ECDSA) | Private/public keypair | Compact signatures, mobile/IoT |

### Symmetric vs. Asymmetric

```
Symmetric (HS256):   Sign with secret → Verify with SAME secret
                     ⚠️ Verifier can also forge tokens

Asymmetric (ES256):  Sign with private key → Verify with public key
                     ✅ Verifier CANNOT forge tokens
```

## DJ.ai Connection

DJ.ai uses ES256-signed JWTs for **Apple Music developer tokens**:

```csharp
// oauth-proxy/Functions/AppleMusicOAuthFunctions.cs
// Generates a developer token signed with the team's ES256 private key
// Claims:
//   iss: Apple Music Team ID (from Key Vault)
//   iat: Current timestamp
//   exp: Current time + 6 hours
// Header:
//   alg: ES256
//   kid: Apple Music Key ID (identifies which key Apple should use to verify)
```

**Why ES256?** Apple requires ECDSA P-256 signatures. ES256 produces compact signatures (64 bytes vs. RSA's 256 bytes), which is important since the token is sent in every API request header.

The private key is stored in Azure Key Vault (`AppleMusic:PrivateKey`) and never exposed to the client. The backend signs the token and returns it to the Electron app, which includes it in Apple Music API requests.

## Key Takeaways

- JWTs have three parts: Header (algorithm), Payload (claims), Signature (proof)
- **Base64URL ≠ encryption** — anyone can decode and read the payload
- Use **asymmetric** algorithms (ES256, RS256) when verifiers shouldn't be able to forge tokens
- Always include `exp` (expiry) to limit token lifetime
- DJ.ai uses ES256 for Apple Music because Apple requires ECDSA P-256

## References

- [JWT.io — Introduction](https://jwt.io/introduction)
- [RFC 7519 — JSON Web Token](https://datatracker.ietf.org/doc/html/rfc7519)
- [RFC 7518 — JSON Web Algorithms](https://datatracker.ietf.org/doc/html/rfc7518)
