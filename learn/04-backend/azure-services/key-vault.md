# Azure Key Vault

## What Is Key Vault?

Azure Key Vault is a cloud service for securely storing and accessing secrets — API keys, passwords, certificates, and cryptographic keys. Instead of storing secrets in configuration files or environment variables, you store them in Key Vault and access them at runtime.

Key Vault provides:
- **Encryption at rest** — secrets encrypted with HSM-backed keys
- **Access auditing** — every access is logged
- **RBAC** — fine-grained permissions (who can read which secrets)
- **Soft delete** — accidental deletions can be recovered

## Accessing Secrets in .NET

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

// Create client with Managed Identity authentication
var client = new SecretClient(
    new Uri("https://your-vault.vault.azure.net/"),
    new DefaultAzureCredential()
);

// Retrieve a secret
KeyVaultSecret secret = await client.GetSecretAsync("SpotifyClientSecret");
string value = secret.Value;
```

## Caching for Performance

Key Vault has rate limits (~2000 GET/10 seconds per vault). DJ.ai caches secrets in memory:

```csharp
public class KeyVaultSecretService : ISecretService
{
    private readonly SecretClient _client;
    private readonly IMemoryCache _cache;

    public async Task<string> GetSecretAsync(string secretName)
    {
        return await _cache.GetOrCreateAsync(secretName, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            var secret = await _client.GetSecretAsync(secretName);
            return secret.Value.Value;
        }) ?? throw new InvalidOperationException(
            $"Failed to retrieve secret: {secretName}");
    }
}
```

The 1-hour TTL balances freshness with performance — secrets rarely change, but the cache ensures they eventually refresh.

## Secrets Stored in DJ.ai's Key Vault

| Secret Name | Purpose |
|-------------|---------|
| `SpotifyClientId` | Spotify OAuth client ID |
| `SpotifyClientSecret` | Spotify OAuth client secret |
| `AppleMusicTeamId` | Apple Developer Team ID |
| `AppleMusicKeyId` | Apple Music API key ID |
| `AppleMusicPrivateKey` | Apple Music signing key (PEM) |

## Key Links

- [Azure Key Vault Overview](https://learn.microsoft.com/en-us/azure/key-vault/general/overview)
- [Key Vault Security](https://learn.microsoft.com/en-us/azure/key-vault/general/security-features)
- [.NET Key Vault Client](https://learn.microsoft.com/en-us/azure/key-vault/secrets/quick-create-net)

## Key Takeaways

- Key Vault is the **single source of truth** for production secrets
- Use `DefaultAzureCredential` for Managed Identity authentication
- **Cache secrets** in memory to avoid rate limits and improve latency
- Key Vault has **soft delete** — accidental deletions are recoverable

## DJ.ai Connection

DJ.ai's `KeyVaultSecretService` in `oauth-proxy/Services/` wraps the `SecretClient` with `IMemoryCache` for 1-hour TTL caching. The `SecretClient` is registered in `oauth-proxy/Program.cs` only when running in production (not local development). The Key Vault URL comes from configuration (`KeyVaultUrl`), and authentication uses `DefaultAzureCredential` which automatically picks up the system-assigned Managed Identity in Azure. The `HealthCheckFunction` verifies Key Vault connectivity by attempting to read the `SpotifyClientId` secret.
