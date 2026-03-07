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

        var isHealthy = keyVaultStatus == "connected";
        var statusCode = isHealthy
            ? System.Net.HttpStatusCode.OK
            : System.Net.HttpStatusCode.ServiceUnavailable;

        var response = req.CreateResponse(statusCode);
        await response.WriteAsJsonAsync(new
        {
            status = isHealthy ? "healthy" : "degraded",
            keyVault = keyVaultStatus,
            timestamp
        });

        return response;
    }
}
