using Microsoft.Extensions.Logging;
using Moq;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Tests.Helpers;

/// <summary>
/// Base class for OAuth function tests that sets up common mock dependencies.
/// </summary>
public abstract class FunctionTestBase : IDisposable
{
    protected MockSecretService SecretService { get; }
    protected Mock<IDeviceAuthService> DeviceAuthMock { get; }
    protected Mock<IStateStoreService> StateStoreMock { get; }
    protected Mock<IValidationService> ValidationMock { get; }
    protected TestHttpMessageHandler HttpMessageHandler { get; }
    protected IHttpClientFactory HttpClientFactory { get; }
    private bool _disposed;

    protected const string ValidDeviceToken = "11111111-1111-1111-1111-111111111111";
    protected const string ValidState = "22222222-2222-2222-2222-222222222222";
    protected const string ValidRedirectUri = "http://localhost:5173/oauth/callback";

    protected FunctionTestBase()
    {
        SecretService = MockSecretService.WithDefaults();

        // Device auth: valid device, rate limit passes by default
        DeviceAuthMock = new Mock<IDeviceAuthService>();
        DeviceAuthMock.Setup(d => d.IsValidDevice(It.IsAny<string>())).Returns(true);
        DeviceAuthMock.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>())).Returns(true);

        // State store: store succeeds, consume returns the device token by default
        StateStoreMock = new Mock<IStateStoreService>();
        StateStoreMock
            .Setup(s => s.StoreStateAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<TimeSpan?>()))
            .Returns(Task.CompletedTask);
        StateStoreMock
            .Setup(s => s.ConsumeStateAsync(It.IsAny<string>()))
            .ReturnsAsync(ValidDeviceToken);

        // Validation: everything valid by default
        ValidationMock = new Mock<IValidationService>();
        ValidationMock.Setup(v => v.IsValidRedirectUri(It.IsAny<string>(), It.IsAny<bool>())).Returns(true);
        ValidationMock.Setup(v => v.IsValidOAuthCode(It.IsAny<string>())).Returns(true);
        ValidationMock.Setup(v => v.IsValidOAuthState(It.IsAny<string>())).Returns(true);
        ValidationMock.Setup(v => v.IsValidDeviceToken(It.IsAny<string>())).Returns(true);

        // HTTP handler for outbound token exchange calls
        HttpMessageHandler = new TestHttpMessageHandler();
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock
            .Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(() => new HttpClient(HttpMessageHandler));
        HttpClientFactory = httpClientFactoryMock.Object;
    }

    /// <summary>
    /// Create a typed ILogger&lt;T&gt; backed by a NullLoggerFactory (no output).
    /// </summary>
    protected static ILogger<T> CreateLogger<T>()
    {
        return LoggerFactory.Create(builder => builder.AddFilter(_ => false))
            .CreateLogger<T>();
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                HttpMessageHandler.Dispose();
            }
            _disposed = true;
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
