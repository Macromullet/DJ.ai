using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using DJai.OAuthProxy.Models;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Functions;

public class YouTubeOAuthFunctions
{
    private readonly ILogger<YouTubeOAuthFunctions> _logger;
    private readonly ISecretService _secretService;
    private readonly IDeviceAuthService _deviceAuthService;
    private readonly IValidationService _validationService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IStateStoreService _stateStore;

    public YouTubeOAuthFunctions(
        ILogger<YouTubeOAuthFunctions> logger,
        ISecretService secretService,
        IDeviceAuthService deviceAuthService,
        IValidationService validationService,
        IHttpClientFactory httpClientFactory,
        IStateStoreService stateStore)
    {
        _logger = logger;
        _secretService = secretService;
        _deviceAuthService = deviceAuthService;
        _validationService = validationService;
        _httpClientFactory = httpClientFactory;
        _stateStore = stateStore;
    }

    [Function("YouTubeOAuthInitiate")]
    public async Task<HttpResponseData> InitiateYouTubeOAuth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/youtube/initiate")] HttpRequestData req)
    {
        try
        {
            var deviceToken = req.Headers.TryGetValues("X-Device-Token", out var tokenValues) ? tokenValues.FirstOrDefault() : null;
            if (string.IsNullOrEmpty(deviceToken) || !_deviceAuthService.IsValidDevice(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidDevice", 
                    Message = "Invalid or missing device token" 
                });
                return errorResp;
            }

            var body = await req.ReadFromJsonAsync<OAuthInitiateRequest>();
            if (body == null || string.IsNullOrEmpty(body.RedirectUri))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRequest", 
                    Message = "Missing redirectUri" 
                });
                return errorResp;
            }

            // Validate redirect URI
            if (!_validationService.IsValidRedirectUri(body.RedirectUri, requireHttps: false))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRedirectUri", 
                    Message = "Invalid redirect URI format" 
                });
                return errorResp;
            }

            if (!_deviceAuthService.CheckAndRecordRequest(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.TooManyRequests);
                await errorResp.WriteAsJsonAsync(new ErrorResponse
                {
                    Error = "RateLimitExceeded",
                    Message = "Too many requests"
                });
                return errorResp;
            }

            // Get client ID from Key Vault
            var clientId = await _secretService.GetSecretAsync("GoogleClientId");
            
            // Generate state token and store in distributed cache
            var state = Guid.NewGuid().ToString();
            await _stateStore.StoreStateAsync(state, deviceToken);

            // Build OAuth URL
            var scope = "https://www.googleapis.com/auth/youtube.readonly";
            var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
                $"client_id={Uri.EscapeDataString(clientId)}&" +
                $"redirect_uri={Uri.EscapeDataString(body.RedirectUri)}&" +
                $"response_type=code&" +
                $"scope={Uri.EscapeDataString(scope)}&" +
                $"access_type=offline&" +
                $"state={state}";

            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new OAuthInitiateResponse
            {
                AuthUrl = authUrl,
                State = state
            });

            _logger.LogInformation($"OAuth initiated for device: {deviceToken}");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating YouTube OAuth");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }

    [Function("YouTubeOAuthExchange")]
    public async Task<HttpResponseData> ExchangeYouTubeToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/youtube/exchange")] HttpRequestData req)
    {
        try
        {
            var deviceToken = req.Headers.TryGetValues("X-Device-Token", out var tokenValues) ? tokenValues.FirstOrDefault() : null;
            if (string.IsNullOrEmpty(deviceToken) || !_deviceAuthService.IsValidDevice(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidDevice", 
                    Message = "Invalid device token" 
                });
                return errorResp;
            }

            var body = await req.ReadFromJsonAsync<OAuthExchangeRequest>();
            if (body == null || string.IsNullOrEmpty(body.Code) || string.IsNullOrEmpty(body.State))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRequest", 
                    Message = "Missing code or state" 
                });
                return errorResp;
            }

            // Validate inputs
            if (!_validationService.IsValidOAuthCode(body.Code))
            {
                _logger.LogWarning($"Invalid OAuth code format from device: {deviceToken}");
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidCode", 
                    Message = "Invalid authorization code format" 
                });
                return errorResp;
            }

            if (!_validationService.IsValidOAuthState(body.State))
            {
                _logger.LogWarning($"Invalid state format from device: {deviceToken}");
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidState", 
                    Message = "Invalid state format" 
                });
                return errorResp;
            }

            if (body.RedirectUri != null && !_validationService.IsValidRedirectUri(body.RedirectUri, requireHttps: false))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRedirectUri", 
                    Message = "Invalid redirect URI format" 
                });
                return errorResp;
            }

            // Validate state token (atomic get-and-delete to prevent TOCTOU race)
            var storedDevice = await _stateStore.ConsumeStateAsync(body.State);
            if (storedDevice == null || storedDevice != deviceToken)
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidState", 
                    Message = "Invalid state parameter" 
                });
                return errorResp;
            }

            if (!_deviceAuthService.CheckAndRecordRequest(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.TooManyRequests);
                await errorResp.WriteAsJsonAsync(new ErrorResponse
                {
                    Error = "RateLimitExceeded",
                    Message = "Too many requests"
                });
                return errorResp;
            }

            // Get secrets from Key Vault
            var clientId = await _secretService.GetSecretAsync("GoogleClientId");
            var clientSecret = await _secretService.GetSecretAsync("GoogleClientSecret");

            // Exchange authorization code for tokens
            using var httpClient = _httpClientFactory.CreateClient();
            var tokenRequest = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("code", body.Code),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("redirect_uri", body.RedirectUri ?? "http://localhost:5173/oauth/callback"),
                new KeyValuePair<string, string>("grant_type", "authorization_code")
            });

            var tokenResponse = await httpClient.PostAsync("https://oauth2.googleapis.com/token", tokenRequest);
            var tokenJson = await tokenResponse.Content.ReadAsStringAsync();

            if (!tokenResponse.IsSuccessStatusCode)
            {
                _logger.LogError($"Token exchange failed: {tokenJson}");
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "TokenExchangeFailed", 
                    Message = "Failed to exchange code for token" 
                });
                return errorResp;
            }

            var tokenData = JsonSerializer.Deserialize<JsonElement>(tokenJson);
            
            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new OAuthTokenResponse
            {
                AccessToken = tokenData.GetProperty("access_token").GetString() ?? "",
                RefreshToken = tokenData.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
                ExpiresIn = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType = tokenData.GetProperty("token_type").GetString() ?? "Bearer"
            });

            _logger.LogInformation($"Token exchanged successfully for device: {deviceToken}");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging YouTube token");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }

    [Function("YouTubeOAuthRefresh")]
    public async Task<HttpResponseData> RefreshYouTubeToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/youtube/refresh")] HttpRequestData req)
    {
        try
        {
            var deviceToken = req.Headers.TryGetValues("X-Device-Token", out var tokenValues) ? tokenValues.FirstOrDefault() : null;
            if (string.IsNullOrEmpty(deviceToken) || !_deviceAuthService.IsValidDevice(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidDevice", 
                    Message = "Invalid device token" 
                });
                return errorResp;
            }

            var body = await req.ReadFromJsonAsync<OAuthRefreshRequest>();
            if (body == null || string.IsNullOrEmpty(body.RefreshToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRequest", 
                    Message = "Missing refreshToken" 
                });
                return errorResp;
            }

            if (!_deviceAuthService.CheckAndRecordRequest(deviceToken))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.TooManyRequests);
                await errorResp.WriteAsJsonAsync(new ErrorResponse
                {
                    Error = "RateLimitExceeded",
                    Message = "Too many requests"
                });
                return errorResp;
            }

            // Get secrets from Key Vault
            var clientId = await _secretService.GetSecretAsync("GoogleClientId");
            var clientSecret = await _secretService.GetSecretAsync("GoogleClientSecret");

            // Refresh the token
            using var httpClient = _httpClientFactory.CreateClient();
            var refreshRequest = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("refresh_token", body.RefreshToken),
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("grant_type", "refresh_token")
            });

            var refreshResponse = await httpClient.PostAsync("https://oauth2.googleapis.com/token", refreshRequest);
            var refreshJson = await refreshResponse.Content.ReadAsStringAsync();

            if (!refreshResponse.IsSuccessStatusCode)
            {
                _logger.LogError($"Token refresh failed: {refreshJson}");
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "TokenRefreshFailed", 
                    Message = "Failed to refresh token" 
                });
                return errorResp;
            }

            var tokenData = JsonSerializer.Deserialize<JsonElement>(refreshJson);
            
            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new OAuthTokenResponse
            {
                AccessToken = tokenData.GetProperty("access_token").GetString() ?? "",
                RefreshToken = body.RefreshToken, // Refresh tokens are reusable
                ExpiresIn = tokenData.GetProperty("expires_in").GetInt32(),
                TokenType = tokenData.GetProperty("token_type").GetString() ?? "Bearer"
            });

            _logger.LogInformation($"Token refreshed successfully for device: {deviceToken}");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing YouTube token");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }
}
