using System.Net;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Moq;
using DJai.OAuthProxy.Functions;
using DJai.OAuthProxy.Models;
using DJai.OAuthProxy.Services;
using DJai.OAuthProxy.Tests.Helpers;

namespace DJai.OAuthProxy.Tests.Functions;

public class SpotifyOAuthFunctionsTests : FunctionTestBase
{
    private readonly SpotifyOAuthFunctions _functions;

    public SpotifyOAuthFunctionsTests()
    {
        _functions = new SpotifyOAuthFunctions(
            CreateLogger<SpotifyOAuthFunctions>(),
            SecretService,
            DeviceAuthMock.Object,
            ValidationMock.Object,
            HttpClientFactory,
            StateStoreMock.Object);
    }

    #region Initiate

    [Fact]
    public async Task Initiate_ValidRequest_ReturnsSpotifyAuthUrl()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateSpotifyOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();
        body.Should().NotBeNull();
        body!.AuthUrl.Should().Contain("accounts.spotify.com/authorize");
        body.State.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Initiate_AuthUrlContainsCorrectScopes()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateSpotifyOAuth(req);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();

        var authUrl = body!.AuthUrl;
        authUrl.Should().Contain("client_id=test-spotify-client-id");
        authUrl.Should().Contain("response_type=code");
        authUrl.Should().Contain("streaming");
        authUrl.Should().Contain("user-read-private");
        authUrl.Should().Contain("user-library-read");
        authUrl.Should().Contain("user-top-read");
    }

    [Fact]
    public async Task Initiate_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri });

        var result = await _functions.InitiateSpotifyOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Initiate_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateSpotifyOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Initiate_StoredStateMatchesResponseState()
    {
        string? capturedState = null;
        StateStoreMock.Setup(s => s.StoreStateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan?>()))
            .Callback<string, string, TimeSpan?>((state, _, _) => capturedState = state)
            .Returns(Task.CompletedTask);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateSpotifyOAuth(req);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();

        capturedState.Should().NotBeNullOrEmpty();
        body!.State.Should().Be(capturedState, "state in response must match what was stored in the state store");
        body.AuthUrl.Should().Contain($"state={capturedState}", "auth URL must contain the same state token");
    }

    #endregion

    #region Exchange

    [Fact]
    public async Task Exchange_ValidRequest_ReturnsTokens()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "spotify-auth-code-123",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthTokenResponse>();
        body!.AccessToken.Should().Be("test-access-token");
        body.RefreshToken.Should().Be("test-refresh-token");
    }

    [Fact]
    public async Task Exchange_SendsBasicAuthHeader()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "spotify-code-456",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        await _functions.ExchangeSpotifyToken(req);

        var sentRequest = HttpMessageHandler.SentRequests[0];
        sentRequest.RequestUri!.ToString().Should().Be("https://accounts.spotify.com/api/token");

        // Verify Basic auth header: base64("client_id:client_secret")
        var expectedAuth = Convert.ToBase64String(
            Encoding.UTF8.GetBytes("test-spotify-client-id:test-spotify-client-secret"));
        sentRequest.Headers.TryGetValues("Authorization", out var authValues).Should().BeTrue();
        authValues!.First().Should().Be($"Basic {expectedAuth}");
    }

    [Fact]
    public async Task Exchange_TokenEndpointError_ReturnsBadRequest()
    {
        HttpMessageHandler.EnqueueTokenErrorResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "bad-code",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("TokenExchangeFailed");
    }

    [Fact]
    public async Task Exchange_InvalidStateConsumed_ReturnsBadRequest()
    {
        StateStoreMock.Setup(s => s.ConsumeStateAsync(It.IsAny<string>()))
            .ReturnsAsync((string?)null);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "valid-code-123",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Refresh

    [Fact]
    public async Task Refresh_ValidRequest_ReturnsNewTokens()
    {
        HttpMessageHandler.EnqueueTokenResponse(accessToken: "new-spotify-token");

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "spotify-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthTokenResponse>();
        body!.AccessToken.Should().Be("new-spotify-token");
    }

    [Fact]
    public async Task Refresh_UsesBasicAuthHeader()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "spotify-refresh-token" },
            deviceToken: ValidDeviceToken);

        await _functions.RefreshSpotifyToken(req);

        var sentRequest = HttpMessageHandler.SentRequests[0];
        sentRequest.RequestUri!.ToString().Should().Be("https://accounts.spotify.com/api/token");
        sentRequest.Headers.TryGetValues("Authorization", out var authValues).Should().BeTrue();
        authValues!.First().Should().StartWith("Basic ");
    }

    [Fact]
    public async Task Refresh_PreservesOriginalRefreshTokenWhenNotReturned()
    {
        // Enqueue response without refresh_token
        HttpMessageHandler.EnqueueJsonResponse(HttpStatusCode.OK,
            JsonSerializer.Serialize(new
            {
                access_token = "refreshed-token",
                expires_in = 3600,
                token_type = "Bearer"
            }));

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "original-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthTokenResponse>();
        body!.RefreshToken.Should().Be("original-refresh-token");
    }

    [Fact]
    public async Task Refresh_MissingRefreshToken_ReturnsBadRequest()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Refresh_TokenEndpointError_ReturnsBadRequest()
    {
        HttpMessageHandler.EnqueueTokenErrorResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "expired-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("TokenRefreshFailed");
    }

    [Fact]
    public async Task Exchange_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "spotify-code-123",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Refresh_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "spotify-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Refresh_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "some-refresh-token" });

        var result = await _functions.RefreshSpotifyToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion
}
