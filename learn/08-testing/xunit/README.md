# xUnit.net — Backend Testing

## Overview

[xUnit.net](https://xunit.net/) is DJ.ai's backend testing framework. The 123 backend tests in `oauth-proxy.Tests/` use xUnit for test structure, **Moq** for mocking Azure services, and **FluentAssertions** for readable assertions.

xUnit is the modern .NET testing framework — used by the .NET team itself, with clean conventions and excellent async support.

## Test Suite Structure

```
oauth-proxy.Tests/
├── AppleMusicOAuthFunctionsTests.cs    # Apple Music JWT, validation
├── SpotifyOAuthFunctionsTests.cs       # Spotify OAuth flow tests
├── YouTubeOAuthFunctionsTests.cs       # YouTube OAuth flow tests
├── HealthCheckFunctionTests.cs         # Health endpoint tests
├── ValidationServiceTests.cs           # URI/code/state validation
├── RedisStateStoreServiceTests.cs      # State storage/consumption
├── RedisDeviceAuthServiceTests.cs      # Device token + rate limiting
└── Helpers/
    ├── FunctionTestBase.cs             # Shared test infrastructure
    ├── MockSecretService.cs            # Key Vault mock
    ├── MockHttpObjects.cs              # HTTP response builder
    └── TestHttpMessageHandler.cs       # Configurable HTTP mock
```

## Learning Path

| Topic | File | What You'll Learn |
|-------|------|-------------------|
| [Fundamentals](./fundamentals.md) | xUnit basics | [Fact], [Theory], test lifecycle |
| [Moq](./moq.md) | Mocking in .NET | Mock<T>, Setup, Verify |
| [FluentAssertions](./fluent-assertions.md) | Readable assertions | Should(), BeEquivalentTo() |

## Quick Example

```csharp
public class SpotifyOAuthFunctionsTests : FunctionTestBase
{
    [Fact]
    public async Task Exchange_WithValidCode_ReturnsTokens()
    {
        // Arrange
        SetupMockHttpResponse(HttpStatusCode.OK, tokenResponse);

        // Act
        var result = await _functions.Exchange(request);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var tokens = result.As<OkObjectResult>().Value;
        tokens.Should().BeEquivalentTo(expectedTokens);
    }
}
```

## Key Takeaways

- xUnit + Moq + FluentAssertions is the "holy trinity" of .NET testing
- `FunctionTestBase` provides shared setup (mocks, helpers) for all function tests
- Tests mock boundaries (HTTP, Key Vault, Redis) and test real function logic
- Apple Music tests generate real EC keys and JWTs for validation testing

## DJ.ai Connection

The backend test suite ensures DJ.ai's OAuth proxy is reliable and secure. Tests cover the complete OAuth lifecycle (initiate, exchange, refresh), error handling (invalid codes, expired tokens, rate limits), and security measures (state validation, device authentication). The `FunctionTestBase` pattern demonstrates how DI enables testable Azure Functions.

## Further Reading

- [xUnit.net Getting Started](https://xunit.net/docs/getting-started/netcore/cmdline)
- [xUnit vs NUnit vs MSTest Comparison](https://xunit.net/docs/comparisons)
