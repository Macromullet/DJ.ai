# Moq — .NET Mocking Framework

## Concept

[Moq](https://github.com/devlooped/moq) is the most popular mocking framework for .NET. It creates mock implementations of interfaces and abstract classes, allowing you to control their behavior and verify interactions. In DJ.ai, Moq mocks the boundaries between Azure Functions and external services (Key Vault, Redis, HTTP APIs).

## Core API

### Creating Mocks

```csharp
// Create a mock of an interface
var mockSecretService = new Mock<ISecretService>();
var mockDatabase = new Mock<IDatabase>();
var mockConnectionMultiplexer = new Mock<IConnectionMultiplexer>();
```

### Setup — Define Behavior

```csharp
// Return a specific value
mockSecretService
    .Setup(s => s.GetSecretAsync("spotify-client-id"))
    .ReturnsAsync("test-client-id");

// Return different values for different inputs
mockSecretService
    .Setup(s => s.GetSecretAsync("spotify-client-secret"))
    .ReturnsAsync("test-client-secret");

// Throw an exception
mockSecretService
    .Setup(s => s.GetSecretAsync("missing-key"))
    .ThrowsAsync(new KeyNotFoundException("Key not found"));
```

### Using the Mock

```csharp
// .Object gives you the mocked instance
var functions = new SpotifyOAuthFunctions(
    mockSecretService.Object,    // ISecretService
    mockStateStore.Object,       // IStateStoreService
    mockDeviceAuth.Object,       // IDeviceAuthService
    mockHttpClientFactory.Object // IHttpClientFactory
);
```

### Verify — Assert Interactions

```csharp
// Verify a method was called
mockSecretService.Verify(
    s => s.GetSecretAsync("spotify-client-id"),
    Times.Once()
);

// Verify with specific arguments
mockDeviceAuth.Verify(
    d => d.ValidateDeviceToken(It.Is<string>(t => t.Length == 36)),
    Times.Once()
);

// Verify never called
mockSecretService.Verify(
    s => s.GetSecretAsync("unused-key"),
    Times.Never()
);
```

### Argument Matchers

```csharp
It.IsAny<string>()          // Any string value
It.Is<string>(s => s.StartsWith("spotify"))  // Custom predicate
It.IsIn("value1", "value2") // One of these values
It.IsRegex(@"\d{6}")        // Matches regex
```

### Callback — Side Effects

```csharp
string capturedCode = null;
mockStateStore
    .Setup(s => s.ConsumeState(It.IsAny<string>()))
    .Callback<string>(code => capturedCode = code)
    .ReturnsAsync(true);
```

## How DJ.ai Uses Moq

### MockSecretService

DJ.ai has a custom `MockSecretService` helper that wraps a dictionary:

```csharp
// From oauth-proxy.Tests/Helpers/MockSecretService.cs
public class MockSecretService : ISecretService
{
    private readonly Dictionary<string, string> _secrets = new();

    public void SetSecret(string key, string value) => _secrets[key] = value;

    public Task<string> GetSecretAsync(string key) =>
        _secrets.TryGetValue(key, out var value)
            ? Task.FromResult(value)
            : throw new KeyNotFoundException(key);
}
```

### TestHttpMessageHandler

For testing HTTP calls to Spotify/Google token endpoints:

```csharp
// Configurable mock HTTP handler
var handler = new TestHttpMessageHandler(
    HttpStatusCode.OK,
    JsonSerializer.Serialize(new {
        access_token = "test-token",
        refresh_token = "test-refresh",
        expires_in = 3600
    })
);

var httpClient = new HttpClient(handler);
```

### Mocking Redis (IConnectionMultiplexer)

```csharp
var mockMultiplexer = new Mock<IConnectionMultiplexer>();
var mockDatabase = new Mock<IDatabase>();

mockMultiplexer
    .Setup(m => m.GetDatabase(It.IsAny<int>(), It.IsAny<object>()))
    .Returns(mockDatabase.Object);

mockDatabase
    .Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
    .ReturnsAsync(new RedisValue("cached-state-value"));
```

## Common Patterns

| Pattern | When to Use | Example |
|---------|-------------|---------|
| `Setup().Returns()` | Control return values | Mock Key Vault secrets |
| `Setup().Throws()` | Test error handling | Key not found, network failure |
| `Verify()` | Assert interactions | Ensure rate limit was checked |
| `Callback()` | Capture arguments | Inspect what was stored in Redis |

## Key Takeaways

- `Mock<T>` creates mocks of interfaces — perfect for DI-based architectures
- `Setup()` controls behavior; `Verify()` asserts interactions
- `It.IsAny<T>()` and `It.Is<T>()` provide flexible argument matching
- Use `Verify` sparingly — prefer asserting outputs over verifying calls (anti-tautology)
- Custom helpers (MockSecretService, TestHttpMessageHandler) simplify common patterns

## DJ.ai Connection

Moq enables DJ.ai's backend tests to run without Azure Key Vault, Redis, or external OAuth APIs. The `FunctionTestBase` class provides pre-configured mocks for all dependencies, so each test starts with a clean, predictable environment. The `MockSecretService` pattern (a real dictionary behind the interface) is a borderline "fake" — more realistic than a pure mock.

## Further Reading

- [Moq Quickstart](https://github.com/devlooped/moq/wiki/Quickstart)
- [Moq Documentation](https://documentation.help/Moq/)
- [Moq GitHub Repository](https://github.com/devlooped/moq)
