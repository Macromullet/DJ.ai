# xUnit.net Fundamentals

## Concept

xUnit.net uses attributes to define tests and theories. Unlike older frameworks (NUnit, MSTest), xUnit creates a **new instance** of the test class for each test method — eliminating shared state and making tests naturally isolated.

## [Fact] — Single Test Case

```csharp
public class ValidationServiceTests
{
    [Fact]
    public void ValidateRedirectUri_WithValidUri_ReturnsTrue()
    {
        var service = new ValidationService();
        var result = service.ValidateRedirectUri("http://localhost:5173/oauth/callback");
        result.Should().BeTrue();
    }

    [Fact]
    public void ValidateRedirectUri_WithInvalidUri_ReturnsFalse()
    {
        var service = new ValidationService();
        var result = service.ValidateRedirectUri("https://evil.com/steal-tokens");
        result.Should().BeFalse();
    }
}
```

## [Theory] + [InlineData] — Parameterized Tests

```csharp
public class ValidationServiceTests
{
    [Theory]
    [InlineData("http://localhost:5173/oauth/callback", true)]
    [InlineData("http://localhost:5174/oauth/callback", true)]
    [InlineData("https://evil.com/steal-tokens", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void ValidateRedirectUri_ReturnsExpected(string uri, bool expected)
    {
        var service = new ValidationService();
        service.ValidateRedirectUri(uri).Should().Be(expected);
    }
}
```

### [MemberData] — Complex Test Data

```csharp
public static IEnumerable<object[]> InvalidRequestData => new[]
{
    new object[] { null, "code is required" },
    new object[] { "", "code is required" },
    new object[] { "valid-code", null },  // Missing redirect URI
};

[Theory]
[MemberData(nameof(InvalidRequestData))]
public async Task Exchange_WithInvalidRequest_ReturnsBadRequest(
    string code, string expectedError)
{
    // Test with various invalid inputs
}
```

## Test Lifecycle

xUnit creates a new class instance for each test method:

```csharp
public class MyTests
{
    private readonly IService _service;

    // Constructor runs BEFORE each test (like [SetUp] in NUnit)
    public MyTests()
    {
        _service = new ServiceUnderTest();
    }

    [Fact]
    public void Test1() { /* fresh _service instance */ }

    [Fact]
    public void Test2() { /* another fresh _service instance */ }
}
```

### IDisposable — Cleanup

```csharp
public class MyTests : IDisposable
{
    public MyTests() { /* setup */ }

    public void Dispose() { /* cleanup after each test */ }
}
```

### IAsyncLifetime — Async Setup/Teardown

```csharp
public class MyTests : IAsyncLifetime
{
    public async Task InitializeAsync() { /* async setup */ }
    public async Task DisposeAsync() { /* async cleanup */ }
}
```

## How DJ.ai Uses xUnit

### FunctionTestBase Pattern

All OAuth function tests inherit from `FunctionTestBase`, which provides shared mock setup:

```csharp
public class SpotifyOAuthFunctionsTests : FunctionTestBase
{
    private readonly SpotifyOAuthFunctions _functions;

    public SpotifyOAuthFunctionsTests()
    {
        // Constructor creates fresh mocks for each test
        _functions = new SpotifyOAuthFunctions(
            MockSecretService,
            MockStateStore,
            MockDeviceAuth,
            MockHttpClientFactory
        );
    }
}
```

### Apple Music: Reflection for Static State

Apple Music functions cache developer tokens in static fields. Tests use reflection to reset this state:

```csharp
public AppleMusicOAuthFunctionsTests()
{
    // Reset static cached token between tests
    typeof(AppleMusicOAuthFunctions)
        .GetField("_cachedDeveloperToken", BindingFlags.NonPublic | BindingFlags.Static)
        ?.SetValue(null, null);

    typeof(AppleMusicOAuthFunctions)
        .GetField("_tokenExpiry", BindingFlags.NonPublic | BindingFlags.Static)
        ?.SetValue(null, DateTimeOffset.MinValue);
}
```

### Real Crypto in Tests

Apple Music tests generate real EC keys for JWT testing (not mocked):

```csharp
private ECDsa GenerateTestKey()
{
    var key = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    return key;
}
```

## Key Takeaways

- `[Fact]` for single tests, `[Theory]` + `[InlineData]` for parameterized tests
- New class instance per test = automatic isolation (no shared mutable state)
- Constructor = setup, `IDisposable.Dispose()` = teardown
- `FunctionTestBase` provides shared infrastructure without shared state

## DJ.ai Connection

xUnit's per-test isolation is critical for DJ.ai's OAuth tests — each test gets fresh mocks, preventing token state from leaking between tests. The Apple Music tests demonstrate an advanced pattern: using reflection to reset static state that would otherwise persist across test instances.

## Further Reading

- [xUnit.net Getting Started](https://xunit.net/docs/getting-started/netcore/cmdline)
- [xUnit vs NUnit vs MSTest](https://xunit.net/docs/comparisons)
- [Shared Context in xUnit](https://xunit.net/docs/shared-context)
