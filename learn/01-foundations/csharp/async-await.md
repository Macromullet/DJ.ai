# C# Async/Await

> Task-based asynchronous programming — how DJ.ai's backend handles I/O without blocking threads.

Every Azure Function endpoint in DJ.ai's OAuth proxy is `async`. When the backend calls Azure Key Vault to fetch a client secret, exchanges an OAuth code with Spotify's token endpoint, or checks Redis for rate limiting state, it uses `async/await` to yield the thread back to the pool while waiting for I/O. This enables a single Azure Functions host to handle many concurrent requests efficiently.

---

## Core Concepts

### Task and Task\<T\>

In C#, `Task` represents an asynchronous operation that returns no value, and `Task<T>` returns a value of type `T`. These are analogous to TypeScript's `Promise<void>` and `Promise<T>`.

```csharp
// Returns a value — Task<string>
public async Task<string> GetSecretAsync(string name)
{
    var secret = await _keyVaultClient.GetSecretAsync(name);
    return secret.Value.Value;
}

// Returns no value — Task
public async Task ValidateDeviceTokenAsync(string token)
{
    var isValid = await _deviceAuth.ValidateAsync(token);
    if (!isValid) throw new UnauthorizedAccessException();
}
```

### The async/await Pattern

`async` marks a method as asynchronous. `await` suspends execution until the awaited `Task` completes, then resumes on an available thread. The compiler transforms async methods into state machines under the hood.

```csharp
// From DJ.ai's OAuth exchange pattern
[Function("SpotifyOAuthExchange")]
public async Task<HttpResponseData> ExchangeSpotifyCode(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post",
     Route = "oauth/spotify/exchange")] HttpRequestData req)
{
    // 1. Read and deserialize the request body
    var body = await req.ReadFromJsonAsync<OAuthExchangeRequest>();

    // 2. Validate the device token (I/O — Redis lookup)
    await _deviceAuth.ValidateAndRecordAsync(body.DeviceToken);

    // 3. Fetch client secret from Key Vault (I/O — HTTP to Azure)
    var clientSecret = await _secretService.GetSecretAsync("Spotify-ClientSecret");

    // 4. Exchange code for tokens (I/O — HTTP to Spotify)
    var tokens = await ExchangeCodeAsync(body.Code, clientSecret);

    // 5. Return the response
    var response = req.CreateResponse(HttpStatusCode.OK);
    await response.WriteAsJsonAsync(tokens);
    return response;
}
```

Each `await` frees the thread to handle other requests. No thread is blocked waiting for Key Vault or Spotify.

### ConfigureAwait

`ConfigureAwait(false)` tells the runtime not to capture and restore the synchronization context after an await. In library code and Azure Functions (where there's no UI thread), this avoids unnecessary context switching:

```csharp
// In service code — no need to return to original context
var secret = await _client.GetSecretAsync(name).ConfigureAwait(false);
```

**Rule of thumb:** Use `ConfigureAwait(false)` in library/service code. Omit it in UI code (not applicable for DJ.ai's backend, but relevant if you ever write WPF/WinForms).

### Cancellation Tokens

`CancellationToken` enables cooperative cancellation of async operations. Azure Functions passes one automatically when the host is shutting down:

```csharp
public async Task<string> GetSecretAsync(string name, CancellationToken ct = default)
{
    var secret = await _client.GetSecretAsync(name, cancellationToken: ct);
    return secret.Value.Value;
}
```

### Exception Handling

Exceptions in async methods are captured in the returned `Task` and re-thrown when `await`ed:

```csharp
try
{
    var tokens = await ExchangeCodeAsync(code, secret);
    await response.WriteAsJsonAsync(tokens);
}
catch (HttpRequestException ex)
{
    _logger.LogError(ex, "Token exchange failed for Spotify");
    var error = req.CreateResponse(HttpStatusCode.BadGateway);
    await error.WriteAsJsonAsync(new ErrorResponse
    {
        Error = "exchange_failed",
        Message = "Failed to exchange authorization code"
    });
    return error;
}
```

### Parallel Async Operations

Like TypeScript's `Promise.all`, C# offers `Task.WhenAll`:

```csharp
// Fetch multiple secrets in parallel
var tasks = new[]
{
    _secretService.GetSecretAsync("Spotify-ClientId"),
    _secretService.GetSecretAsync("Spotify-ClientSecret"),
};
var results = await Task.WhenAll(tasks);
string clientId = results[0];
string clientSecret = results[1];
```

---

## 🔗 DJ.ai Connection

- **`oauth-proxy/Functions/SpotifyOAuthFunctions.cs`** — Three async endpoints: `InitiateSpotifyOAuth`, `ExchangeSpotifyCode`, `RefreshSpotifyToken` — all use `async Task<HttpResponseData>`
- **`oauth-proxy/Functions/YouTubeOAuthFunctions.cs`** — Same pattern for YouTube OAuth
- **`oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`** — JWT token generation with `SemaphoreSlim` for thread-safe caching alongside async Key Vault calls
- **`oauth-proxy/Services/KeyVaultSecretService.cs`** — Async Key Vault access with 1-hour in-memory caching
- **`oauth-proxy/Services/RedisDeviceAuthService.cs`** — Async Redis operations with in-memory fallback
- **`oauth-proxy/Program.cs`** — Configures `AddHttpClient()` for async HTTP calls to provider token endpoints

---

## 🎯 Key Takeaways

- **Every Azure Function in DJ.ai is async** — returns `Task<HttpResponseData>`
- `await` releases the thread; the runtime resumes on any available thread when I/O completes
- Use **`ConfigureAwait(false)`** in service/library code to avoid unnecessary context capture
- **`CancellationToken`** enables graceful shutdown — always accept it in service methods
- Use **`Task.WhenAll`** for parallel async operations (fetching multiple secrets)
- Exceptions in async code propagate naturally through `await` — use try/catch as normal

---

## 📖 Resources

- [Asynchronous Programming with async and await](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/concepts/async/) — Official guide
- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/) — Stephen Toub's definitive guide
- [Task-based Asynchronous Pattern](https://learn.microsoft.com/en-us/dotnet/standard/asynchronous-programming-patterns/task-based-asynchronous-pattern-tap) — The TAP pattern
- [Cancellation in Managed Threads](https://learn.microsoft.com/en-us/dotnet/standard/threading/cancellation-in-managed-threads) — CancellationToken deep dive
