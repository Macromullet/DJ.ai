using System.Collections.Concurrent;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Tests.Helpers;

/// <summary>
/// In-memory implementation of ISecretService for unit testing.
/// </summary>
public class MockSecretService : ISecretService
{
    private readonly ConcurrentDictionary<string, string> _secrets = new();

    public MockSecretService() { }

    public MockSecretService(IDictionary<string, string> initialSecrets)
    {
        foreach (var kvp in initialSecrets)
        {
            _secrets[kvp.Key] = kvp.Value;
        }
    }

    public Task<string> GetSecretAsync(string secretName)
    {
        if (_secrets.TryGetValue(secretName, out var value))
        {
            return Task.FromResult(value);
        }

        throw new Exception($"Secret not found: {secretName}");
    }

    public void SetSecret(string secretName, string value)
    {
        _secrets[secretName] = value;
    }

    public void RemoveSecret(string secretName)
    {
        _secrets.TryRemove(secretName, out _);
    }

    /// <summary>
    /// Creates a MockSecretService pre-loaded with standard test OAuth credentials.
    /// </summary>
    public static MockSecretService WithDefaults()
    {
        return new MockSecretService(new Dictionary<string, string>
        {
            ["SpotifyClientId"] = "test-spotify-client-id",
            ["SpotifyClientSecret"] = "test-spotify-client-secret",
            ["AppleMusicTeamId"] = "TEST12345",
            ["AppleMusicKeyId"] = "TESTKEY01",
            ["AppleMusicPrivateKey"] = "test-private-key"
        });
    }
}
