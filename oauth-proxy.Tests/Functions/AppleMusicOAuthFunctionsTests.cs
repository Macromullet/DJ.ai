using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using FluentAssertions;
using Moq;
using DJai.OAuthProxy.Functions;
using DJai.OAuthProxy.Models;
using DJai.OAuthProxy.Services;
using DJai.OAuthProxy.Tests.Helpers;

namespace DJai.OAuthProxy.Tests.Functions;

public class AppleMusicOAuthFunctionsTests : FunctionTestBase
{
    private readonly AppleMusicOAuthFunctions _functions;
    private readonly string _testPemKey;

    public AppleMusicOAuthFunctionsTests()
    {
        ResetDeveloperTokenCache();

        // Generate a real P-256 EC key for JWT signing tests
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        _testPemKey = new string(PemEncoding.Write("PRIVATE KEY", ecdsa.ExportPkcs8PrivateKey()));

        SecretService.SetSecret("AppleMusicTeamId", "TEST12345");
        SecretService.SetSecret("AppleMusicKeyId", "TESTKEY01");
        SecretService.SetSecret("AppleMusicPrivateKey", _testPemKey);

        _functions = new AppleMusicOAuthFunctions(
            CreateLogger<AppleMusicOAuthFunctions>(),
            SecretService,
            DeviceAuthMock.Object,
            ValidationMock.Object,
            HttpClientFactory,
            StateStoreMock.Object);
    }

    /// <summary>
    /// Resets static cached developer token between tests to ensure isolation.
    /// </summary>
    private static void ResetDeveloperTokenCache()
    {
        var type = typeof(AppleMusicOAuthFunctions);
        type.GetField("_cachedDeveloperToken", BindingFlags.NonPublic | BindingFlags.Static)
            ?.SetValue(null, null);
        type.GetField("_tokenExpiry", BindingFlags.NonPublic | BindingFlags.Static)
            ?.SetValue(null, DateTime.MinValue);
    }

    #region Initiate

    [Fact]
    public async Task Initiate_ValidRequest_ReturnsAppleMusicAuthUrl()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateAppleMusicOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();
        body.Should().NotBeNull();
        body!.AuthUrl.Should().Contain("authorize.music.apple.com");
        body.State.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Initiate_AuthUrlContainsTeamAndKeyId()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateAppleMusicOAuth(req);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();

        body!.AuthUrl.Should().Contain("team_id=TEST12345");
        body.AuthUrl.Should().Contain("key_id=TESTKEY01");
        body.AuthUrl.Should().Contain($"redirect_uri={Uri.EscapeDataString(ValidRedirectUri)}");
    }

    [Fact]
    public async Task Initiate_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri });

        var result = await _functions.InitiateAppleMusicOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Initiate_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateAppleMusicOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    #endregion

    #region Developer Token

    [Fact]
    public async Task DeveloperToken_ValidKey_ReturnsJwt()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);

        var result = await _functions.GetAppleMusicDeveloperToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        var root = body.RootElement;
        var token = root.GetProperty("developerToken").GetString();
        token.Should().NotBeNullOrEmpty();

        // Verify JWT structure (three dot-separated parts)
        token!.Split('.').Should().HaveCount(3);
    }

    [Fact]
    public async Task DeveloperToken_JwtHasCorrectClaims()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);

        var result = await _functions.GetAppleMusicDeveloperToken(req);

        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        var token = body.RootElement.GetProperty("developerToken").GetString()!;

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        jwt.Issuer.Should().Be("TEST12345");
        jwt.Header.Kid.Should().Be("TESTKEY01");
        jwt.Header.Alg.Should().Be("ES256");
    }

    [Fact]
    public async Task DeveloperToken_ReturnsExpiresIn()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);

        var result = await _functions.GetAppleMusicDeveloperToken(req);

        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        var expiresIn = body.RootElement.GetProperty("expiresIn").GetInt32();
        expiresIn.Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task DeveloperToken_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(new { });

        var result = await _functions.GetAppleMusicDeveloperToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeveloperToken_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);

        var result = await _functions.GetAppleMusicDeveloperToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task DeveloperToken_SecondCallReturnsCachedToken()
    {
        var req1 = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);
        var result1 = await _functions.GetAppleMusicDeveloperToken(req1);

        using var body1 = ((MockHttpResponseData)result1).ReadBodyAsJson();
        var token1 = body1.RootElement.GetProperty("developerToken").GetString();

        var req2 = MockHttpRequestData.CreateJsonRequest(
            new { }, deviceToken: ValidDeviceToken);
        var result2 = await _functions.GetAppleMusicDeveloperToken(req2);

        using var body2 = ((MockHttpResponseData)result2).ReadBodyAsJson();
        var token2 = body2.RootElement.GetProperty("developerToken").GetString();

        token1.Should().Be(token2, "second call should return the cached developer token");
    }

    #endregion

    #region Validate User Token

    [Fact]
    public async Task ValidateUserToken_ValidToken_ReturnsValid()
    {
        // Enqueue success response from Apple Music API
        HttpMessageHandler.EnqueueJsonResponse(HttpStatusCode.OK, "{}");

        var req = MockHttpRequestData.CreateJsonRequest(
            new Dictionary<string, string> { ["musicUserToken"] = "valid-music-user-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ValidateAppleMusicUserToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        using var body = ((MockHttpResponseData)result).ReadBodyAsJson();
        body.RootElement.GetProperty("valid").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task ValidateUserToken_InvalidToken_ReturnsUnauthorized()
    {
        // Enqueue 401 from Apple Music API
        HttpMessageHandler.EnqueueJsonResponse(HttpStatusCode.Unauthorized, """{"error":"invalid_token"}""");

        var req = MockHttpRequestData.CreateJsonRequest(
            new Dictionary<string, string> { ["musicUserToken"] = "expired-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ValidateAppleMusicUserToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("InvalidToken");
    }

    [Fact]
    public async Task ValidateUserToken_MissingMusicUserToken_ReturnsBadRequest()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new Dictionary<string, string> { ["someOtherField"] = "value" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ValidateAppleMusicUserToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ValidateUserToken_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new Dictionary<string, string> { ["musicUserToken"] = "some-token" });

        var result = await _functions.ValidateAppleMusicUserToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ValidateUserToken_SendsDeveloperTokenAndMusicUserToken()
    {
        HttpMessageHandler.EnqueueJsonResponse(HttpStatusCode.OK, "{}");

        var req = MockHttpRequestData.CreateJsonRequest(
            new Dictionary<string, string> { ["musicUserToken"] = "my-user-token" },
            deviceToken: ValidDeviceToken);

        await _functions.ValidateAppleMusicUserToken(req);

        var sentRequest = HttpMessageHandler.SentRequests[0];
        sentRequest.RequestUri!.ToString().Should().Contain("api.music.apple.com");
        sentRequest.Headers.TryGetValues("Authorization", out var authValues).Should().BeTrue();
        authValues!.First().Should().StartWith("Bearer ");
        sentRequest.Headers.TryGetValues("Music-User-Token", out var mutValues).Should().BeTrue();
        mutValues!.First().Should().Be("my-user-token");
    }

    #endregion
}
