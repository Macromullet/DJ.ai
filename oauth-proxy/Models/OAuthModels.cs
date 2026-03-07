using System.Text.Json.Serialization;

namespace DJai.OAuthProxy.Models;

public class OAuthInitiateRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public string RedirectUri { get; set; } = string.Empty;
}

public class OAuthInitiateResponse
{
    public string AuthUrl { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
}

public class OAuthExchangeRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string? RedirectUri { get; set; }
}

public class OAuthTokenResponse
{
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public int ExpiresIn { get; set; }
    public string TokenType { get; set; } = "Bearer";
}

public class OAuthRefreshRequest
{
    public string DeviceToken { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
}

public class AppleMusicValidateRequest
{
    [JsonPropertyName("musicUserToken")]
    public string MusicUserToken { get; set; } = string.Empty;
}

public class ErrorResponse
{
    public string Error { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
