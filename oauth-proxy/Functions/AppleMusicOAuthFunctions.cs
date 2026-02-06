using System.Text.Json;
using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using DJai.OAuthProxy.Models;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Functions;

public class AppleMusicOAuthFunctions
{
    private readonly ILogger<AppleMusicOAuthFunctions> _logger;
    private readonly ISecretService _secretService;
    private readonly IDeviceAuthService _deviceAuthService;
    private readonly IValidationService _validationService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IStateStoreService _stateStore;

    // Cached developer token to avoid regenerating JWT on every request
    private static string? _cachedDeveloperToken;
    private static DateTime _tokenExpiry = DateTime.MinValue;
    private static readonly SemaphoreSlim _tokenLock = new(1, 1);

    public AppleMusicOAuthFunctions(
        ILogger<AppleMusicOAuthFunctions> logger,
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

    [Function("AppleMusicOAuthInitiate")]
    public async Task<HttpResponseData> InitiateAppleMusicOAuth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/apple/initiate")] HttpRequestData req)
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

            if (!_validationService.IsValidRedirectUri(body.RedirectUri, requireHttps: false))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRedirectUri", 
                    Message = "Invalid redirect URI" 
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

            // Get Apple Music team ID and key ID from Key Vault
            var teamId = await _secretService.GetSecretAsync("AppleMusicTeamId");
            var keyId = await _secretService.GetSecretAsync("AppleMusicKeyId");
            
            // Generate state token and store in distributed cache
            var state = Guid.NewGuid().ToString();
            await _stateStore.StoreStateAsync(state, deviceToken);

            // Apple Music uses Music User Token(different from standard OAuth)
            // The auth URL triggers Apple's MusicKit authorization
            var authUrl = $"https://authorize.music.apple.com/woa?" +
                $"team_id={Uri.EscapeDataString(teamId)}&" +
                $"key_id={Uri.EscapeDataString(keyId)}&" +
                $"redirect_uri={Uri.EscapeDataString(body.RedirectUri)}&" +
                $"state={state}";

            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new OAuthInitiateResponse
            {
                AuthUrl = authUrl,
                State = state
            });

            _logger.LogInformation($"Apple Music OAuth initiated for device: {deviceToken}");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating Apple Music OAuth");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }

    [Function("AppleMusicGetDeveloperToken")]
    public async Task<HttpResponseData> GetAppleMusicDeveloperToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/apple/developer-token")] HttpRequestData req)
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

            // Get Apple Music credentials from Key Vault
            var teamId = await _secretService.GetSecretAsync("AppleMusicTeamId");
            var keyId = await _secretService.GetSecretAsync("AppleMusicKeyId");
            var privateKey = await _secretService.GetSecretAsync("AppleMusicPrivateKey");

            // Generate JWT Developer Token
            // Apple Music requires a JWT signed with ES256 (ECDSA with P-256 and SHA-256)
            // Token expires in 6 months max
            
            var developerToken = await GetOrGenerateDeveloperTokenAsync(teamId, keyId, privateKey);
            var expiresIn = Math.Max(0, (int)(_tokenExpiry - DateTime.UtcNow).TotalSeconds);

            var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                developerToken,
                expiresIn
            });

            _logger.LogInformation($"Apple Music developer token generated for device: {deviceToken}");
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Apple Music developer token");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }

    // Note: Apple Music uses a different authentication model than standard OAuth
    // It uses Developer Tokens (JWT) + Music User Tokens
    // The exchange and refresh endpoints work differently
    
    [Function("AppleMusicValidateUserToken")]
    public async Task<HttpResponseData> ValidateAppleMusicUserToken(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/apple/validate")] HttpRequestData req)
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

            var body = await req.ReadFromJsonAsync<Dictionary<string, string>>();
            if (body == null || !body.ContainsKey("musicUserToken"))
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidRequest", 
                    Message = "Missing musicUserToken" 
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

            var musicUserToken = body["musicUserToken"];

            // Validate the Music User Token by making a test API call
            using var httpClient = _httpClientFactory.CreateClient();
            
            // Get developer token from cached/generated token
            var teamId = await _secretService.GetSecretAsync("AppleMusicTeamId");
            var keyId = await _secretService.GetSecretAsync("AppleMusicKeyId");
            var privateKey = await _secretService.GetSecretAsync("AppleMusicPrivateKey");
            var developerToken = await GetOrGenerateDeveloperTokenAsync(teamId, keyId, privateKey);
            
            httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {developerToken}");
            httpClient.DefaultRequestHeaders.Add("Music-User-Token", musicUserToken);

            var testResponse = await httpClient.GetAsync("https://api.music.apple.com/v1/me/library/playlists?limit=1");
            
            if (testResponse.IsSuccessStatusCode)
            {
                var response = req.CreateResponse(System.Net.HttpStatusCode.OK);
                await response.WriteAsJsonAsync(new { valid = true });
                return response;
            }
            else
            {
                var errorResp = req.CreateResponse(System.Net.HttpStatusCode.Unauthorized);
                await errorResp.WriteAsJsonAsync(new ErrorResponse 
                { 
                    Error = "InvalidToken", 
                    Message = "Music User Token is invalid or expired" 
                });
                return errorResp;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Apple Music user token");
            var errorResp = req.CreateResponse(System.Net.HttpStatusCode.InternalServerError);
            await errorResp.WriteAsJsonAsync(new ErrorResponse 
            { 
                Error = "ServerError", 
                Message = "An internal error occurred. Please try again." 
            });
            return errorResp;
        }
    }

    private async Task<string> GetOrGenerateDeveloperTokenAsync(string teamId, string keyId, string privateKeyPem)
    {
        // Fast path: return cached token if still valid (with 24-hour buffer before expiry)
        if (_cachedDeveloperToken != null && DateTime.UtcNow < _tokenExpiry.AddHours(-24))
        {
            return _cachedDeveloperToken;
        }

        await _tokenLock.WaitAsync();
        try
        {
            // Double-check after acquiring lock
            if (_cachedDeveloperToken != null && DateTime.UtcNow < _tokenExpiry.AddHours(-24))
            {
                return _cachedDeveloperToken;
            }

            var (token, expiry) = GenerateAppleMusicDeveloperToken(teamId, keyId, privateKeyPem);
            _cachedDeveloperToken = token;
            _tokenExpiry = expiry;
            return token;
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    /// <summary>
    /// Generates an Apple Music Developer Token (JWT signed with ES256)
    /// </summary>
    /// <param name="teamId">Apple Developer Team ID (iss claim)</param>
    /// <param name="keyId">Apple Music Key ID (kid header)</param>
    /// <param name="privateKeyPem">ES256 private key in PEM format (.p8 file contents)</param>
    /// <returns>Tuple of JWT token and its expiry time</returns>
    private (string Token, DateTime Expiry) GenerateAppleMusicDeveloperToken(string teamId, string keyId, string privateKeyPem)
    {
        try
        {
            // Parse the PEM private key
            // Apple Music uses P-256 (prime256v1) elliptic curve
            using var ecdsa = ECDsa.Create();
            ecdsa.ImportFromPem(privateKeyPem);

            // Create ECDSA security key
            var securityKey = new ECDsaSecurityKey(ecdsa)
            {
                KeyId = keyId
            };

            // Create signing credentials with ES256 algorithm
            var signingCredentials = new SigningCredentials(securityKey, SecurityAlgorithms.EcdsaSha256);

            // Create JWT token descriptor
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Issuer = teamId,
                IssuedAt = DateTime.UtcNow,
                Expires = DateTime.UtcNow.AddMonths(6), // Apple Music tokens can last up to 6 months
                SigningCredentials = signingCredentials
            };

            // Generate the JWT token
            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var jwt = tokenHandler.WriteToken(token);

            _logger.LogInformation($"Successfully generated Apple Music developer token (expires: {tokenDescriptor.Expires})");
            
            return (jwt, tokenDescriptor.Expires!.Value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Apple Music JWT token");
            throw new InvalidOperationException("Failed to generate Apple Music developer token. Ensure private key is valid P-256 PEM format.", ex);
        }
    }
}
