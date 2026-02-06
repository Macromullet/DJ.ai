using System;

namespace DJai.OAuthProxy.Services;

public interface IValidationService
{
    bool IsValidRedirectUri(string redirectUri, bool requireHttps = false);
    bool IsValidOAuthCode(string code);
    bool IsValidOAuthState(string state);
    bool IsValidDeviceToken(string deviceToken);
}

public class ValidationService : IValidationService
{
    private static readonly HashSet<string> AllowedRedirectHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "localhost",    // Development
        "127.0.0.1",
        "[::1]"         // IPv6 localhost
    };

    private static readonly HashSet<int> AllowedRedirectPorts = new()
    {
        5173, 5174, 5175, 5176, 5177  // Vite dev server ports
    };

    // Production redirect hosts loaded from ALLOWED_REDIRECT_HOSTS environment variable (comma-separated).
    // Example: "myapp.azurestaticapps.net,djaiapp.com"
    private static readonly HashSet<string> _additionalHosts = new(
        (Environment.GetEnvironmentVariable("ALLOWED_REDIRECT_HOSTS") ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        StringComparer.OrdinalIgnoreCase
    );

    // Custom URI schemes allowed for Electron deep linking (e.g., "djai")
    private static readonly HashSet<string> _allowedCustomSchemes = new(
        (Environment.GetEnvironmentVariable("ALLOWED_REDIRECT_SCHEMES") ?? "djai")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
        StringComparer.OrdinalIgnoreCase
    );

    static ValidationService()
    {
        if (_additionalHosts.Count == 0)
        {
            Console.WriteLine("⚠️  ALLOWED_REDIRECT_HOSTS is not set. Only localhost redirect URIs are allowed. " +
                "Set this environment variable for production deployments.");
        }
    }

    public bool IsValidRedirectUri(string redirectUri, bool requireHttps = false)
    {
        if (string.IsNullOrWhiteSpace(redirectUri))
        {
            return false;
        }

        // Reasonable length (prevent abuse)
        if (redirectUri.Length > 2048)
        {
            return false;
        }

        // Must be valid URI
        if (!Uri.TryCreate(redirectUri, UriKind.Absolute, out var uri))
        {
            return false;
        }

        // Allow custom URI schemes for Electron deep linking (e.g., djai://oauth/callback)
        if (_allowedCustomSchemes.Contains(uri.Scheme))
        {
            return true;
        }

        // Must be HTTP or HTTPS
        if (uri.Scheme != "http" && uri.Scheme != "https")
        {
            return false;
        }

        var host = uri.Host.ToLowerInvariant();
        var isLocalhost = AllowedRedirectHosts.Contains(host);
        var isAdditionalHost = _additionalHosts.Contains(host);

        // Allow http only for localhost; require https for all other hosts
        if (uri.Scheme == "http" && !isLocalhost)
        {
            return false;
        }

        // Host must be in the allowlist (localhost or configured production hosts)
        if (!isLocalhost && !isAdditionalHost)
        {
            return false;
        }

        // For localhost, the port must be in the allowed range
        if (isLocalhost && uri.Port != -1 && !AllowedRedirectPorts.Contains(uri.Port))
        {
            return false;
        }

        return true;
    }

    public bool IsValidOAuthCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return false;
        }

        // OAuth authorization codes are typically 20-512 characters
        if (code.Length < 10 || code.Length > 1024)
        {
            return false;
        }

        // Should be alphanumeric or common OAuth chars (-, _, ., /, +, =)
        // Google uses 4/... format with slashes; Spotify may use base64 with + and =
        return code.All(c => char.IsLetterOrDigit(c) || c == '-' || c == '_' || c == '.' || c == '/' || c == '+' || c == '=');
    }

    public bool IsValidOAuthState(string state)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return false;
        }

        // State tokens should be reasonable length
        if (state.Length < 8 || state.Length > 256)
        {
            return false;
        }

        // Should be alphanumeric or hyphen (GUID format is common)
        return state.All(c => char.IsLetterOrDigit(c) || c == '-');
    }

    public bool IsValidDeviceToken(string deviceToken)
    {
        if (string.IsNullOrWhiteSpace(deviceToken))
        {
            return false;
        }

        // Must be a valid GUID (strict - security improvement from review)
        return Guid.TryParse(deviceToken, out _);
    }
}
