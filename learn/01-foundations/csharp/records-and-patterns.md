# C# Records and Pattern Matching

> Immutable data types and expressive control flow — modern C# features used in DJ.ai's DTOs.

C# records and pattern matching are complementary features: records give you concise, immutable data types perfect for DTOs (Data Transfer Objects), while pattern matching provides expressive ways to inspect and branch on data. DJ.ai uses records for all OAuth request/response models and pattern matching for validation logic.

---

## Core Concepts

### Record Types

A `record` is a reference type that provides value-based equality, immutability by default, and concise syntax. They're ideal for DTOs — objects that carry data between layers without behavior.

```csharp
// Positional record — compiler generates constructor, properties, deconstruct
public record OAuthInitiateRequest(string DeviceToken, string RedirectUri);

// Usage
var request = new OAuthInitiateRequest("device-abc", "http://localhost:5173/oauth/callback");
Console.WriteLine(request.DeviceToken); // "device-abc"
```

Traditional classes require 15+ lines for the same behavior (constructor, properties, Equals, GetHashCode, ToString). Records get it in one line.

### DJ.ai's OAuth Models

```csharp
// From oauth-proxy/Models/OAuthModels.cs
public record OAuthInitiateRequest(string DeviceToken, string RedirectUri);

public record OAuthInitiateResponse(string AuthUrl, string State);

public record OAuthExchangeRequest(
    string DeviceToken,
    string Code,
    string State,
    string? RedirectUri  // Nullable — optional field
);

public record OAuthTokenResponse(
    string AccessToken,
    string? RefreshToken,   // Nullable — not all providers return one
    int ExpiresIn,
    string TokenType = "Bearer"  // Default value
);

public record OAuthRefreshRequest(string DeviceToken, string RefreshToken);

public record ErrorResponse(string Error, string Message);
```

### Value-Based Equality

Unlike classes, records compare by **value** — two records are equal if all their properties are equal:

```csharp
var a = new ErrorResponse("invalid_token", "Token expired");
var b = new ErrorResponse("invalid_token", "Token expired");

Console.WriteLine(a == b);      // true (value equality)
Console.WriteLine(a.Equals(b)); // true
```

### `with` Expressions

Create modified copies of records without mutating the original:

```csharp
var original = new OAuthTokenResponse("token123", "refresh456", 3600);
var refreshed = original with { AccessToken = "newToken789", ExpiresIn = 7200 };

// original is unchanged; refreshed has updated values
```

### Pattern Matching

Pattern matching lets you inspect values and extract data in `switch` expressions, `is` expressions, and `switch` statements.

**Type patterns:**
```csharp
// Check type and cast in one step
if (service is KeyVaultSecretService kvService)
{
    await kvService.RefreshCacheAsync();
}
```

**Property patterns:**
```csharp
// Match on object properties
string Categorize(OAuthTokenResponse token) => token switch
{
    { ExpiresIn: <= 0 } => "expired",
    { RefreshToken: null } => "non-refreshable",
    { ExpiresIn: < 300 } => "expiring-soon",
    _ => "valid"
};
```

**Switch expressions:**
```csharp
// Concise branching based on values
string GetProviderEndpoint(string provider) => provider switch
{
    "spotify" => "https://accounts.spotify.com/api/token",
    "youtube" => "https://oauth2.googleapis.com/token",
    "apple"   => "https://appleid.apple.com/auth/token",
    _ => throw new ArgumentException($"Unknown provider: {provider}")
};
```

**Relational and logical patterns:**
```csharp
string GetRateLimitMessage(int requestCount) => requestCount switch
{
    > 1000 => "Daily limit exceeded",
    > 100  => "Hourly limit exceeded",
    > 50   => "Approaching limit",
    _      => "OK"
};
```

### Record Structs (C# 10+)

For small, frequently-created DTOs, `record struct` provides value-type semantics (stack allocation):

```csharp
public readonly record struct Coordinate(double Latitude, double Longitude);
```

---

## 🔗 DJ.ai Connection

- **`oauth-proxy/Models/OAuthModels.cs`** — All request/response DTOs are records: `OAuthInitiateRequest`, `OAuthInitiateResponse`, `OAuthExchangeRequest`, `OAuthTokenResponse`, `OAuthRefreshRequest`, `ErrorResponse`
- **`oauth-proxy/Functions/SpotifyOAuthFunctions.cs`** — Deserializes request bodies into records, constructs response records
- **`oauth-proxy/Program.cs`** — Pattern matching to select service implementations based on configuration flags
- **`oauth-proxy/Services/ValidationService.cs`** — Pattern matching for redirect URI validation
- **`oauth-proxy/Functions/HealthCheckFunction.cs`** — Constructs anonymous objects (similar pattern to records) for health check responses

---

## 🎯 Key Takeaways

- **Records** provide immutable DTOs with value equality in one line of code
- DJ.ai uses records for all OAuth models — `OAuthInitiateRequest`, `OAuthTokenResponse`, etc.
- **`with` expressions** create modified copies without mutation — great for token refresh
- **Pattern matching** replaces long if/else chains with concise `switch` expressions
- **Property patterns** let you match on nested object properties
- Records + pattern matching together enable a more functional programming style in C#

---

## 📖 Resources

- [Record Types](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/record) — Official record reference
- [Pattern Matching](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/functional/pattern-matching) — Pattern matching overview
- [Switch Expression](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/switch-expression) — Concise branching syntax
- [Records Tutorial](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/tutorials/records) — Hands-on records guide
