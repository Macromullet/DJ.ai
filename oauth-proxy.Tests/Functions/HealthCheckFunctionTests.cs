using System.Net;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using DJai.OAuthProxy.Functions;
using DJai.OAuthProxy.Tests.Helpers;

namespace DJai.OAuthProxy.Tests.Functions;

public class HealthCheckFunctionTests
{
    private static ILogger<T> CreateLogger<T>()
    {
        return LoggerFactory.Create(builder => builder.AddFilter(_ => false))
            .CreateLogger<T>();
    }

    [Fact]
    public async Task HealthCheck_KeyVaultConnected_ReturnsHealthy()
    {
        var secretService = MockSecretService.WithDefaults();
        var logger = CreateLogger<HealthCheckFunction>();
        var function = new HealthCheckFunction(logger, secretService);

        var req = MockHttpRequestData.CreateGetRequest();

        var result = await function.CheckHealth(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        body.RootElement.GetProperty("status").GetString().Should().Be("healthy");
        body.RootElement.GetProperty("keyVault").GetString().Should().Be("connected");
    }

    [Fact]
    public async Task HealthCheck_KeyVaultUnavailable_ReturnsDegraded()
    {
        // Secret service that throws for any secret
        var secretService = new MockSecretService();
        var logger = CreateLogger<HealthCheckFunction>();
        var function = new HealthCheckFunction(logger, secretService);

        var req = MockHttpRequestData.CreateGetRequest();

        var result = await function.CheckHealth(req);

        result.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        body.RootElement.GetProperty("status").GetString().Should().Be("degraded");
        body.RootElement.GetProperty("keyVault").GetString().Should().Be("unavailable");
    }

    [Fact]
    public async Task HealthCheck_ReturnsTimestamp()
    {
        var secretService = MockSecretService.WithDefaults();
        var logger = CreateLogger<HealthCheckFunction>();
        var function = new HealthCheckFunction(logger, secretService);

        var req = MockHttpRequestData.CreateGetRequest();

        var result = await function.CheckHealth(req);

        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        var timestamp = body.RootElement.GetProperty("timestamp").GetString();
        timestamp.Should().NotBeNullOrEmpty();
        // Timestamp should be valid ISO 8601
        DateTimeOffset.TryParse(timestamp, out var parsed).Should().BeTrue();
        parsed.UtcDateTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }
}
