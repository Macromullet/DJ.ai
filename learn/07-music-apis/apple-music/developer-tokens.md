# Apple Music Developer Tokens

## Concept

An Apple Music **Developer Token** is a JSON Web Token (JWT) that identifies your app to Apple's servers. Unlike standard OAuth client credentials, Apple requires you to generate this token yourself by signing it with an **ES256 private key** obtained from the Apple Developer portal.

This token grants access to the public Apple Music catalog. It does not provide access to user-specific data (that requires a Music User Token).

## Token Structure

The JWT contains:

### Header
```json
{
  "alg": "ES256",
  "kid": "ABC123DEF4"  // Key ID from Apple Developer portal
}
```

### Payload
```json
{
  "iss": "TEAM1234AB",  // Apple Developer Team ID
  "iat": 1700000000,     // Issued at (Unix timestamp)
  "exp": 1715552000      // Expires (max 6 months from iat)
}
```

### Signature
Signed using the ES256 algorithm (ECDSA with P-256 curve and SHA-256).

## Generating the Token

### Prerequisites
1. **Apple Developer Account** with MusicKit enabled
2. **MusicKit Private Key** (`.p8` file) — downloaded once from Apple Developer portal
3. **Key ID** — shown when you create the key
4. **Team ID** — found in your Apple Developer account membership page

### Server-Side Generation (Pseudocode)
```csharp
var header = new { alg = "ES256", kid = keyId };
var payload = new {
    iss = teamId,
    iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
    exp = DateTimeOffset.UtcNow.AddMonths(6).ToUnixTimeSeconds()
};
var token = JWT.Encode(payload, privateKey, JwsAlgorithm.ES256, header);
```

## How DJ.ai Generates Developer Tokens

In `oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`, the backend exposes a `POST /oauth/apple/developer-token` endpoint:

1. **Fetch secrets from Key Vault** — Team ID, Key ID, and the ES256 private key (PEM-encoded)
2. **Parse the P-256 key** — Convert PEM to `ECDsa` instance using `ECDsa.ImportPkcs8PrivateKey()`
3. **Build the JWT** — Header with `alg: ES256` and `kid`, payload with `iss` (Team ID), `iat`, and `exp`
4. **Sign with ES256** — ECDSA signature using the P-256 curve
5. **Cache the token** — Stored in a static field with semaphore-based thread safety; reused until 24 hours before expiry

### Caching Strategy

```csharp
// Token cached with semaphore lock for thread safety
private static string? _cachedDeveloperToken;
private static DateTimeOffset _tokenExpiry = DateTimeOffset.MinValue;

// Refresh 24 hours before expiry (6-month validity)
if (_cachedDeveloperToken != null && DateTimeOffset.UtcNow < _tokenExpiry.AddDays(-1))
    return _cachedDeveloperToken;
```

### Testing

In `oauth-proxy.Tests/AppleMusicOAuthFunctionsTests.cs`, tests use **real P-256 EC keys** generated at test time and reflection to reset the static token cache between test runs:

```csharp
// Reset cached token between tests
typeof(AppleMusicOAuthFunctions)
    .GetField("_cachedDeveloperToken", BindingFlags.NonPublic | BindingFlags.Static)
    ?.SetValue(null, null);
```

## Security Considerations

- **Never expose the private key** — it stays in Azure Key Vault, fetched via Managed Identity
- **Never send the developer token to the client as a secret** — it's a bearer token, but it only grants catalog access
- **Rotate keys periodically** — Apple allows multiple active keys
- **6-month max expiry** — Apple enforces this limit on the JWT `exp` claim

## Key Takeaways

- Developer tokens are self-signed JWTs — no OAuth token exchange needed
- ES256 (P-256 + SHA-256) is the only supported signing algorithm
- Tokens should be cached server-side to avoid unnecessary key operations
- The private key never leaves the backend (Azure Key Vault + Managed Identity)

## DJ.ai Connection

The developer token is the first piece of the Apple Music puzzle. `AppleMusicOAuthFunctions.cs` generates and caches it; `AppleMusicProvider.ts` fetches it during initialization and passes it to `MusicKit.configure()`. Without this token, MusicKit JS won't load — it's the app's identity card to Apple's servers.

## Further Reading

- [Generating Developer Tokens (Apple)](https://developer.apple.com/documentation/applemusicapi/generating_developer_tokens)
- [JSON Web Token (JWT) RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [ES256 Algorithm (RFC 7518 §3.4)](https://datatracker.ietf.org/doc/html/rfc7518#section-3.4)
