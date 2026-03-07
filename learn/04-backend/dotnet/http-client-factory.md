# HttpClient Factory

## The Problem: Socket Exhaustion

Creating `new HttpClient()` for each request seems harmless, but it causes a serious issue: **socket exhaustion**. Each `HttpClient` instance holds open TCP connections, and disposing it doesn't immediately release them (they linger in TIME_WAIT state). Under load, this exhausts available sockets:

```csharp
// ❌ BAD: Creates new sockets for every request
public async Task<string> ExchangeToken(string code)
{
    using var client = new HttpClient();  // New socket each time!
    var response = await client.PostAsync("https://oauth2.googleapis.com/token", content);
    return await response.Content.ReadAsStringAsync();
}
```

## The Solution: IHttpClientFactory

`IHttpClientFactory` manages a pool of `HttpMessageHandler` instances, reusing TCP connections while properly rotating DNS:

```csharp
// Register in DI
services.AddHttpClient();

// Inject and use
public class YouTubeOAuthFunctions
{
    private readonly IHttpClientFactory _httpClientFactory;

    public YouTubeOAuthFunctions(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<TokenResponse> ExchangeToken(string code)
    {
        var client = _httpClientFactory.CreateClient();  // Pooled handler!
        var response = await client.PostAsync(
            "https://oauth2.googleapis.com/token", content);
        return await response.Content.ReadAsJsonAsync<TokenResponse>();
    }
}
```

## Named and Typed Clients

For more control, register named clients with pre-configured settings:

```csharp
// Named client with specific configuration
services.AddHttpClient("google", client =>
{
    client.BaseAddress = new Uri("https://oauth2.googleapis.com/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
});

// Usage
var client = _httpClientFactory.CreateClient("google");
var response = await client.PostAsync("token", content);
```

## Resilience with Aspire

DJ.ai's `ServiceDefaults` adds standard resilience policies to all HTTP clients:

```csharp
services.ConfigureHttpClientDefaults(http =>
{
    http.AddStandardResilienceHandler();  // Retries, circuit breaker, timeout
    http.AddServiceDiscovery();
});
```

This automatically adds retry logic, circuit breakers, and timeouts to every `HttpClient` created by the factory.

## Key Links

- [IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory)
- [HttpClient Guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)
- [Standard Resilience Handler](https://learn.microsoft.com/en-us/dotnet/core/resilience/http-resilience)

## Key Takeaways

- **Never** create `HttpClient` with `new` in a loop — use `IHttpClientFactory`
- The factory **pools handlers** to prevent socket exhaustion
- Named clients pre-configure base addresses and headers
- Aspire's `AddStandardResilienceHandler()` adds **retries and circuit breakers** automatically

## DJ.ai Connection

DJ.ai registers `IHttpClientFactory` in `oauth-proxy/Program.cs` with `services.AddHttpClient()`. The OAuth functions use it for token exchange calls to Google (`https://oauth2.googleapis.com/token`), Spotify (`https://accounts.spotify.com/api/token`), and Apple Music token validation. The `DJai.ServiceDefaults` project adds standard resilience policies, ensuring that transient failures (network blips, provider rate limits) are automatically retried with exponential backoff.
