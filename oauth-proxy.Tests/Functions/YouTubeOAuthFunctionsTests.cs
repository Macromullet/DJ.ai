using System.Net;
using FluentAssertions;
using Moq;
using DJai.OAuthProxy.Functions;
using DJai.OAuthProxy.Models;
using DJai.OAuthProxy.Services;
using DJai.OAuthProxy.Tests.Helpers;

namespace DJai.OAuthProxy.Tests.Functions;

public class YouTubeOAuthFunctionsTests : FunctionTestBase
{
    private readonly YouTubeOAuthFunctions _functions;

    public YouTubeOAuthFunctionsTests()
    {
        _functions = new YouTubeOAuthFunctions(
            CreateLogger<YouTubeOAuthFunctions>(),
            SecretService,
            DeviceAuthMock.Object,
            ValidationMock.Object,
            HttpClientFactory,
            StateStoreMock.Object);
    }

    #region Initiate

    [Fact]
    public async Task Initiate_ValidRequest_ReturnsOkWithAuthUrl()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();
        body.Should().NotBeNull();
        body!.AuthUrl.Should().NotBeNullOrEmpty();
        body.State.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Initiate_AuthUrlContainsRequiredParams()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateYouTubeOAuth(req);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();

        var authUrl = body!.AuthUrl;
        authUrl.Should().Contain("accounts.google.com");
        authUrl.Should().Contain("client_id=test-google-client-id");
        authUrl.Should().Contain($"redirect_uri={Uri.EscapeDataString(ValidRedirectUri)}");
        authUrl.Should().Contain("response_type=code");
        authUrl.Should().Contain("youtube.readonly");
        authUrl.Should().Contain("access_type=offline");
        authUrl.Should().Contain($"state={body.State}");
    }

    [Fact]
    public async Task Initiate_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri });

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Initiate_InvalidDevice_ReturnsUnauthorized()
    {
        DeviceAuthMock.Setup(d => d.IsValidDevice("bad-device")).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: "bad-device");

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Initiate_MissingRedirectUri_ReturnsBadRequest()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = "" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Initiate_InvalidRedirectUri_ReturnsBadRequest()
    {
        ValidationMock.Setup(v => v.IsValidRedirectUri("https://evil.com/callback", It.IsAny<bool>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = "https://evil.com/callback" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Initiate_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        var result = await _functions.InitiateYouTubeOAuth(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task Initiate_StoresStateInStateStore()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthInitiateRequest { RedirectUri = ValidRedirectUri },
            deviceToken: ValidDeviceToken);

        await _functions.InitiateYouTubeOAuth(req);

        StateStoreMock.Verify(
            s => s.StoreStateAsync(It.IsAny<string>(), ValidDeviceToken, It.IsAny<TimeSpan?>()),
            Times.Once);
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

        var result = await _functions.InitiateYouTubeOAuth(req);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthInitiateResponse>();

        capturedState.Should().NotBeNullOrEmpty();
        body!.State.Should().Be(capturedState, "state in response must match what was stored in the state store");
        body.AuthUrl.Should().Contain($"state={capturedState}", "auth URL must contain the same state token");
    }

    #endregion

    #region Exchange

    [Fact]
    public async Task Exchange_ValidRequest_ReturnsTokenResponse()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "valid-auth-code-12345",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthTokenResponse>();
        body.Should().NotBeNull();
        body!.AccessToken.Should().Be("test-access-token");
        body.RefreshToken.Should().Be("test-refresh-token");
        body.ExpiresIn.Should().Be(3600);
        body.TokenType.Should().Be("Bearer");
    }

    [Fact]
    public async Task Exchange_SendsCorrectRequestToGoogleEndpoint()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "test-code-12345",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        await _functions.ExchangeYouTubeToken(req);

        HttpMessageHandler.SentRequests.Should().HaveCount(1);
        var sentRequest = HttpMessageHandler.SentRequests[0];
        sentRequest.RequestUri!.ToString().Should().Be("https://oauth2.googleapis.com/token");
        sentRequest.Method.Should().Be(HttpMethod.Post);

        var content = await sentRequest.Content!.ReadAsStringAsync();
        content.Should().Contain("grant_type=authorization_code");
        content.Should().Contain("code=test-code-12345");
        content.Should().Contain("client_id=test-google-client-id");
        content.Should().Contain("client_secret=test-google-client-secret");
    }

    [Fact]
    public async Task Exchange_MissingCode_ReturnsBadRequest()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest { Code = "", State = ValidState },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Exchange_InvalidCodeFormat_ReturnsBadRequest()
    {
        ValidationMock.Setup(v => v.IsValidOAuthCode(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "suspicious<script>code",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("InvalidCode");
    }

    [Fact]
    public async Task Exchange_InvalidStateConsumed_ReturnsBadRequest()
    {
        StateStoreMock.Setup(s => s.ConsumeStateAsync(It.IsAny<string>()))
            .ReturnsAsync((string?)null);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "valid-code-12345",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Exchange_StateMismatchDevice_ReturnsBadRequest()
    {
        StateStoreMock.Setup(s => s.ConsumeStateAsync(It.IsAny<string>()))
            .ReturnsAsync("different-device-token");

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "valid-code-12345",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Exchange_TokenEndpointError_ReturnsBadRequest()
    {
        HttpMessageHandler.EnqueueTokenErrorResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthExchangeRequest
            {
                Code = "invalid-code-12345",
                State = ValidState,
                RedirectUri = ValidRedirectUri
            },
            deviceToken: ValidDeviceToken);

        var result = await _functions.ExchangeYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("TokenExchangeFailed");
    }

    #endregion

    #region Refresh

    [Fact]
    public async Task Refresh_ValidRequest_ReturnsNewTokens()
    {
        HttpMessageHandler.EnqueueTokenResponse(accessToken: "new-access-token");

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "existing-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = ((MockHttpResponseData)result).ReadBodyAs<OAuthTokenResponse>();
        body.Should().NotBeNull();
        body!.AccessToken.Should().Be("new-access-token");
        body.RefreshToken.Should().Be("existing-refresh-token"); // Original preserved
    }

    [Fact]
    public async Task Refresh_SendsCorrectRequestToGoogleEndpoint()
    {
        HttpMessageHandler.EnqueueTokenResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "my-refresh-token" },
            deviceToken: ValidDeviceToken);

        await _functions.RefreshYouTubeToken(req);

        var sentRequest = HttpMessageHandler.SentRequests[0];
        sentRequest.RequestUri!.ToString().Should().Be("https://oauth2.googleapis.com/token");

        var content = await sentRequest.Content!.ReadAsStringAsync();
        content.Should().Contain("grant_type=refresh_token");
        content.Should().Contain("refresh_token=my-refresh-token");
        content.Should().Contain("client_id=test-google-client-id");
        content.Should().Contain("client_secret=test-google-client-secret");
    }

    [Fact]
    public async Task Refresh_MissingRefreshToken_ReturnsBadRequest()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Refresh_TokenEndpointError_ReturnsBadRequest()
    {
        HttpMessageHandler.EnqueueTokenErrorResponse();

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "expired-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = ((MockHttpResponseData)result).ReadBodyAs<ErrorResponse>();
        body!.Error.Should().Be("TokenRefreshFailed");
    }

    [Fact]
    public async Task Refresh_MissingDeviceToken_ReturnsUnauthorized()
    {
        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "some-refresh-token" });

        var result = await _functions.RefreshYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_RateLimited_ReturnsTooManyRequests()
    {
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(false);

        var req = MockHttpRequestData.CreateJsonRequest(
            new OAuthRefreshRequest { RefreshToken = "some-refresh-token" },
            deviceToken: ValidDeviceToken);

        var result = await _functions.RefreshYouTubeToken(req);

        result.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    #endregion
}
