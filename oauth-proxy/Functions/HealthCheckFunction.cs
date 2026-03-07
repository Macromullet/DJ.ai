using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Functions;

public class HealthCheckFunction
{
    private readonly ILogger<HealthCheckFunction> _logger;
    private readonly ISecretService _secretService;

    public HealthCheckFunction(ILogger<HealthCheckFunction> logger, ISecretService secretService)
    {
        _logger = logger;
        _secretService = secretService;
    }

    [Function("HealthCheck")]
    public async Task<HttpResponseData> CheckHealth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "health")] HttpRequestData req)
    {
        var timestamp = DateTime.UtcNow.ToString("o");
        string keyVaultStatus;
        string? pemKeyStatus = null;

        try
        {
            // Verify Key Vault connectivity by reading a known secret
            await _secretService.GetSecretAsync("SpotifyClientId");
            keyVaultStatus = "connected";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Health check: Key Vault connectivity failed");
            keyVaultStatus = "unavailable";
        }

        // Validate Apple Music PEM key format if Key Vault is available
        if (keyVaultStatus == "connected")
        {
            try
            {
                var privateKey = await _secretService.GetSecretAsync("AppleMusicPrivateKey");
                using var ecdsa = System.Security.Cryptography.ECDsa.Create();
                ecdsa.ImportFromPem(privateKey);
                pemKeyStatus = "valid";
            }
            catch (InvalidOperationException ex)
            {
                // PEM key exists but is not valid P-256 format
                _logger.LogWarning(ex, "Health check: Apple Music PEM key is invalid");
                pemKeyStatus = "invalid";
            }
            catch (System.Security.Cryptography.CryptographicException ex)
            {
                _logger.LogWarning(ex, "Health check: Apple Music PEM key is malformed");
                pemKeyStatus = "invalid";
            }
            catch (Exception)
            {
                // Secret not found — Apple Music not configured (not a health issue)
                pemKeyStatus = "not_configured";
            }
        }

        var isHealthy = keyVaultStatus == "connected" && pemKeyStatus != "invalid";
        var statusCode = isHealthy
            ? System.Net.HttpStatusCode.OK
            : System.Net.HttpStatusCode.ServiceUnavailable;

        var response = req.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(new
        {
            status = isHealthy ? "healthy" : "degraded",
            keyVault = keyVaultStatus,
            appleMusicKey = pemKeyStatus ?? "not_checked",
            timestamp
        });

        return response;
    }
}
