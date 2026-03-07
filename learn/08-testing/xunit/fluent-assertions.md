# FluentAssertions

## Concept

[FluentAssertions](https://fluentassertions.com/) is a .NET library that replaces xUnit's built-in `Assert.Equal()` with readable, chainable assertions using natural language syntax. Instead of `Assert.Equal(expected, actual)` (which reverses the reading order), you write `actual.Should().Be(expected)` — reading left to right like English.

DJ.ai uses FluentAssertions for **all** backend test assertions.

## Core Syntax

### Basic Assertions

```csharp
// Equality
result.Should().Be(42);
result.Should().NotBe(0);

// Null checks
token.Should().NotBeNull();
error.Should().BeNull();

// Boolean
isValid.Should().BeTrue();
isExpired.Should().BeFalse();

// Type checking
result.Should().BeOfType<OkObjectResult>();
result.Should().BeAssignableTo<IActionResult>();
```

### String Assertions

```csharp
message.Should().Be("Success");
message.Should().Contain("token");
message.Should().StartWith("Error:");
message.Should().BeEmpty();
message.Should().MatchRegex(@"\d{6}");
message.Should().HaveLength(36);  // GUID length
```

### Collection Assertions

```csharp
results.Should().HaveCount(3);
results.Should().BeEmpty();
results.Should().NotBeEmpty();
results.Should().Contain(item);
results.Should().ContainSingle();
results.Should().AllSatisfy(r => r.Should().NotBeNull());
results.Should().BeInAscendingOrder(r => r.Name);
```

### Object Assertions

```csharp
// Deep equality
actual.Should().BeEquivalentTo(expected);

// Partial matching (ignore some properties)
actual.Should().BeEquivalentTo(expected, options =>
    options.Excluding(o => o.Timestamp)
);
```

### Exception Assertions

```csharp
// Sync exceptions
Action act = () => service.Validate(null);
act.Should().Throw<ArgumentNullException>()
   .WithMessage("*cannot be null*");

// Async exceptions
Func<Task> act = () => service.ExchangeCodeAsync("invalid");
await act.Should().ThrowAsync<HttpRequestException>();

// No exception
act.Should().NotThrow();
```

### Chaining with And / Which

```csharp
result.Should().BeOfType<OkObjectResult>()
    .Which.Value.Should().BeEquivalentTo(expectedTokens);

tokens.Should().NotBeNull()
    .And.HaveCount(2);
```

## How DJ.ai Uses FluentAssertions

### OAuth Function Tests

```csharp
[Fact]
public async Task Exchange_WithValidCode_ReturnsTokens()
{
    // Arrange
    var request = CreateExchangeRequest("valid-code", "http://localhost:5173/callback");
    SetupMockHttpResponse(HttpStatusCode.OK, tokenResponseJson);

    // Act
    var result = await _functions.Exchange(request);

    // Assert — reads like English
    result.Should().BeOfType<OkObjectResult>();

    var response = (result as OkObjectResult)!.Value;
    response.Should().BeEquivalentTo(new {
        accessToken = "test-access-token",
        refreshToken = "test-refresh-token",
        expiresIn = 3600
    });
}
```

### Error Handling Tests

```csharp
[Fact]
public async Task Exchange_WithInvalidCode_ReturnsBadRequest()
{
    SetupMockHttpResponse(HttpStatusCode.BadRequest, errorJson);

    var result = await _functions.Exchange(request);

    result.Should().BeOfType<BadRequestObjectResult>()
        .Which.Value.Should().BeOfType<ErrorResponse>()
        .Which.Message.Should().Contain("invalid_grant");
}
```

### Rate Limiting Tests

```csharp
[Fact]
public async Task Initiate_WhenRateLimited_Returns429()
{
    mockDeviceAuth.Setup(d => d.CheckAndRecordRequest(It.IsAny<string>()))
        .ReturnsAsync(false);

    var result = await _functions.Initiate(request);

    result.Should().BeOfType<StatusCodeResult>()
        .Which.StatusCode.Should().Be(429);
}
```

## FluentAssertions vs xUnit Assert

| xUnit Assert | FluentAssertions | Advantage |
|-------------|------------------|-----------|
| `Assert.Equal(3, list.Count)` | `list.Should().HaveCount(3)` | Reads left to right |
| `Assert.NotNull(result)` | `result.Should().NotBeNull()` | Chainable |
| `Assert.IsType<T>(result)` | `result.Should().BeOfType<T>()` | `.Which` for chaining |
| `Assert.Throws<T>(() => ...)` | `act.Should().Throw<T>()` | `.WithMessage()` chaining |

## Key Takeaways

- `Should()` starts every assertion chain — it's the FluentAssertions entry point
- `BeEquivalentTo()` does deep object comparison (great for DTOs and responses)
- `.Which` enables chaining: assert type, then assert properties of that type
- Exception testing with `Should().ThrowAsync<T>()` is cleaner than try/catch patterns
- Every DJ.ai backend assertion uses FluentAssertions — it's the project standard

## DJ.ai Connection

FluentAssertions makes DJ.ai's backend tests readable and maintainable. The chaining pattern (`Should().BeOfType<OkObjectResult>().Which.Value.Should()...`) is used extensively in OAuth function tests, where responses need both type checking and value validation. This readability is especially valuable during MOE reviews, where AI agents parse assertions to evaluate test quality.

## Further Reading

- [FluentAssertions Introduction](https://fluentassertions.com/introduction)
- [Exception Assertions](https://fluentassertions.com/exceptions/)
- [Object Graph Comparison](https://fluentassertions.com/objectgraphs/)
- [Collection Assertions](https://fluentassertions.com/collections/)
