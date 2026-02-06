using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace DJai.OAuthProxy.Services;

/// <summary>
/// Stub secret service for local testing without real OAuth credentials.
/// Returns fake/test values for all secrets.
/// </summary>
public class StubSecretService : ISecretService
{
    private readonly Dictionary<string, string> _stubSecrets = new()
    {
        // Stub Google OAuth credentials
        ["GoogleClientId"] = "stub-google-client-id.apps.googleusercontent.com",
        ["GoogleClientSecret"] = "STUB-Google-Client-Secret-12345",
        
        // Stub Spotify OAuth credentials
        ["SpotifyClientId"] = "stub-spotify-client-id-abc123",
        ["SpotifyClientSecret"] = "STUB-Spotify-Client-Secret-67890",
        
        // Stub Apple Music credentials
        ["AppleMusicTeamId"] = "STUB12345",
        ["AppleMusicKeyId"] = "STUB67890",
        ["AppleMusicPrivateKey"] = @"-----BEGIN PRIVATE KEY-----
STUB_PRIVATE_KEY_CONTENT_FOR_TESTING_ONLY
-----END PRIVATE KEY-----"
    };

    public Task<string> GetSecretAsync(string secretName)
    {
        if (_stubSecrets.TryGetValue(secretName, out var stubValue))
        {
            Console.WriteLine($"[StubSecretService] Returning stub value for: {secretName}");
            return Task.FromResult(stubValue);
        }

        // Return a generic stub for unknown secrets
        var genericStub = $"STUB-{secretName}-NotConfigured";
        Console.WriteLine($"[StubSecretService] WARNING: No stub for '{secretName}', returning: {genericStub}");
        return Task.FromResult(genericStub);
    }
}
