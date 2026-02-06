# Apple Music JWT ES256 Signing Implementation

## Overview

The Apple Music OAuth proxy now includes **complete JWT ES256 signing** for generating Apple Music Developer Tokens. This implementation uses the .NET `System.IdentityModel.Tokens.Jwt` library with ECDSA P-256 support.

## What Was Implemented

### Location
`oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`

### Method: `GenerateAppleMusicDeveloperToken()`
```csharp
private string GenerateAppleMusicDeveloperToken(string teamId, string keyId, string privateKeyPem)
```

Generates a JWT token signed with ES256 algorithm, valid for 6 months.

### Key Features
- ✅ **ES256 Algorithm**: ECDSA with P-256 curve and SHA-256
- ✅ **PEM Import**: Parses Apple's `.p8` private key format
- ✅ **6 Month Expiry**: Maximum allowed by Apple Music API
- ✅ **Proper Claims**: Includes `iss` (Team ID), `iat`, and `exp`
- ✅ **Key ID Header**: Sets `kid` in JWT header
- ✅ **Error Handling**: Validates key format and logs errors

### Token Structure

**Header:**
```json
{
  "alg": "ES256",
  "kid": "YOUR_KEY_ID"
}
```

**Payload:**
```json
{
  "iss": "YOUR_TEAM_ID",
  "iat": 1707596800,
  "exp": 1723235200
}
```

**Signature:** ECDSA P-256 signed with your private key

## Setup Requirements

### 1. Apple Developer Account
- Enroll in Apple Developer Program ($99/year)
- Access: https://developer.apple.com/account/

### 2. Create MusicKit Key

1. Go to **Certificates, Identifiers & Profiles**
2. Navigate to **Keys**
3. Click **+** to create new key
4. Select **MusicKit**
5. Download the `.p8` file (you can only download once!)
6. Note your **Key ID** (10 characters)
7. Note your **Team ID** (in Account settings)

### 3. Store Secrets

#### Local Development (local.settings.json)
```json
{
  "Values": {
    "AppleMusicTeamId": "ABC123XYZ",
    "AppleMusicKeyId": "ABCDE12345",
    "AppleMusicPrivateKey": "-----BEGIN PRIVATE KEY-----\nMIGTAgEAMB...\n-----END PRIVATE KEY-----"
  }
}
```

**Note:** The private key should be the **exact contents** of your `.p8` file, including the header and footer lines. Newlines can be represented as `\n`.

#### Azure Production (Key Vault)
```bash
# Set secrets in Azure Key Vault
az keyvault secret set --vault-name "YourKeyVault" \
  --name "AppleMusicTeamId" \
  --value "ABC123XYZ"

az keyvault secret set --vault-name "YourKeyVault" \
  --name "AppleMusicKeyId" \
  --value "ABCDE12345"

az keyvault secret set --vault-name "YourKeyVault" \
  --name "AppleMusicPrivateKey" \
  --file "path/to/AuthKey_ABCDE12345.p8"
```

## Testing

### 1. Start OAuth Proxy Locally
```bash
cd oauth-proxy
func start
```

### 2. Test Developer Token Generation
```bash
curl -X POST http://localhost:7071/api/oauth/apple/developer-token \
  -H "Content-Type: application/json" \
  -H "X-Device-Token: test-device-12345"
```

### 3. Expected Response
```json
{
  "DeveloperToken": "eyJhbGciOiJFUzI1NiIsImtpZCI6IkFCQ0RFMTIzNDUifQ.eyJpc3MiOiJBQkMxMjNYWVoiLCJpYXQiOjE3MDc1OTY4MDAsImV4cCI6MTcyMzIzNTIwMH0.signature_here",
  "ExpiresIn": 15552000
}
```

### 4. Validate Token
Use https://jwt.io to decode and verify:
- **Algorithm**: ES256
- **Header kid**: Matches your Key ID
- **Payload iss**: Matches your Team ID
- **Expiry**: ~6 months from now

### 5. Test with Apple Music API
```bash
# Get catalog search (no user token needed)
curl -H "Authorization: Bearer YOUR_DEVELOPER_TOKEN" \
  "https://api.music.apple.com/v1/catalog/us/search?term=beatles&types=songs&limit=1"
```

## Implementation Details

### Dependencies
- `System.IdentityModel.Tokens.Jwt` (v8.15.0) - Already included
- `Microsoft.IdentityModel.Tokens` - Included with JWT package
- `System.Security.Cryptography` - Built-in .NET

### Algorithm Details
- **Curve**: P-256 (prime256v1, secp256r1)
- **Hash**: SHA-256
- **Format**: PEM (Privacy Enhanced Mail)

### Key Format
Apple provides keys in PKCS#8 PEM format:
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

### Security Notes
- ✅ Private key never leaves the server
- ✅ Token has 6-month expiry (auto-refresh needed)
- ✅ Uses Azure Key Vault in production
- ✅ Rate limiting via device tokens
- ✅ Logging for security audit

## Error Handling

### Invalid Key Format
```
Error: Failed to generate Apple Music developer token. 
Ensure private key is valid P-256 PEM format.
```

**Solution:** Verify `.p8` file format. Should start with `-----BEGIN PRIVATE KEY-----`

### Missing Secrets
```
Error: Secret 'AppleMusicPrivateKey' not found
```

**Solution:** Add secrets to `local.settings.json` or Azure Key Vault

### Invalid Team/Key ID
Apple API will reject tokens with wrong IDs:
```json
{
  "error": "Invalid developer token"
}
```

**Solution:** Verify Team ID and Key ID match your Apple Developer account

## Integration with Frontend

The `AppleMusicProvider.ts` automatically handles token fetching:

```typescript
// 1. Request developer token from proxy
const response = await fetch(`${OAUTH_PROXY_BASE}/oauth/apple/developer-token`, {
  method: 'POST',
  headers: {
    'X-Device-Token': this.deviceToken
  }
});

const { DeveloperToken } = await response.json();

// 2. Configure MusicKit
await MusicKit.configure({
  developerToken: DeveloperToken,
  app: { name: 'DJ.ai', build: '1.0.0' }
});

// 3. Authorize user
const musicUserToken = await MusicKit.getInstance().authorize();
```

## Production Checklist

- [ ] Create Apple Developer account
- [ ] Generate MusicKit key (.p8)
- [ ] Note Team ID and Key ID
- [ ] Store secrets in Azure Key Vault
- [ ] Deploy OAuth proxy to Azure
- [ ] Test token generation
- [ ] Verify Apple Music API calls work
- [ ] Monitor token expiry (6 months)
- [ ] Set up refresh mechanism if needed

## References

- [Apple MusicKit Documentation](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [JWT ES256 Specification](https://datatracker.ietf.org/doc/html/rfc7518#section-3.4)
- [ECDSA P-256 Curve](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.186-4.pdf)

## Status

✅ **Implementation Complete**  
✅ **Build Successful**  
✅ **Ready for Production**

The OAuth proxy is now fully capable of generating valid Apple Music developer tokens!
