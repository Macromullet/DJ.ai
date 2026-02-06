using Azure.Security.KeyVault.Secrets;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace DJai.OAuthProxy.Services;

public interface ISecretService
{
    Task<string> GetSecretAsync(string secretName);
}

public class KeyVaultSecretService : ISecretService
{
    private readonly SecretClient _client;
    private readonly IMemoryCache _cache;

    public KeyVaultSecretService(SecretClient client, IMemoryCache cache)
    {
        _client = client;
        _cache = cache;
    }

    public async Task<string> GetSecretAsync(string secretName)
    {
        return await _cache.GetOrCreateAsync(secretName, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);
            var secret = await _client.GetSecretAsync(secretName);
            return secret.Value.Value;
        }) ?? throw new InvalidOperationException($"Failed to retrieve secret: {secretName}");
    }
}

public class LocalSecretService : ISecretService
{
    private readonly IConfiguration _configuration;

    public LocalSecretService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public Task<string> GetSecretAsync(string secretName)
    {
        // IConfiguration includes user-secrets, env vars, and appsettings
        var value = _configuration[secretName];
        // Fallback to direct env var for standalone func start with local.settings.json
        value ??= Environment.GetEnvironmentVariable(secretName);
        if (string.IsNullOrEmpty(value))
        {
            throw new Exception($"Secret not found: {secretName}");
        }
        return Task.FromResult(value);
    }
}
