# C# Dependency Injection

> Service lifetimes, registration, and resolution — how DJ.ai's backend wires up its services.

Dependency Injection (DI) is a design pattern where a class receives its dependencies from external code rather than creating them itself. In DJ.ai's OAuth proxy, DI is the foundation of the architecture: `Program.cs` registers services like `ISecretService`, `IDeviceAuthService`, and `IStateStoreService`, and the Azure Functions runtime automatically injects them into function constructors.

---

## Core Concepts

### The DI Container

.NET's built-in DI container (`IServiceProvider`) manages the creation and lifetime of services. You register services during startup, and the framework resolves them when needed:

```csharp
// Registration (Program.cs)
services.AddSingleton<ISecretService, KeyVaultSecretService>();

// Resolution (automatic via constructor injection)
public class SpotifyOAuthFunctions
{
    private readonly ISecretService _secretService;

    public SpotifyOAuthFunctions(ISecretService secretService)
    {
        _secretService = secretService; // Injected by the container
    }
}
```

### Service Lifetimes

Each registration specifies how long the service instance lives:

| Lifetime | Method | Behavior |
|----------|--------|----------|
| **Singleton** | `AddSingleton<T>()` | One instance for the entire application lifetime |
| **Scoped** | `AddScoped<T>()` | One instance per HTTP request/scope |
| **Transient** | `AddTransient<T>()` | New instance every time it's requested |

DJ.ai uses **Singleton** for most services because they're stateless or manage their own thread-safe caching:

```csharp
// From oauth-proxy/Program.cs
services.AddSingleton<ISecretService, KeyVaultSecretService>();   // Caches secrets
services.AddSingleton<IDeviceAuthService, RedisDeviceAuthService>(); // Stateless validation
services.AddSingleton<IStateStoreService, RedisStateStoreService>(); // Redis connection
services.AddSingleton<IValidationService, ValidationService>();      // Pure logic
```

### Conditional Registration

DJ.ai's `Program.cs` demonstrates a powerful pattern — choosing implementations based on configuration:

```csharp
// Choose secret service based on environment
if (useStubs)
    services.AddSingleton<ISecretService, StubSecretService>();
else if (isLocal)
    services.AddSingleton<ISecretService, LocalSecretService>();
else
    services.AddSingleton<ISecretService, KeyVaultSecretService>();
```

This means the same `ISecretService` interface is used everywhere, but:
- **Stubs** return hardcoded values for integration testing
- **LocalSecretService** reads from `dotnet user-secrets` or environment variables
- **KeyVaultSecretService** fetches from Azure Key Vault with Managed Identity

The function code never knows which implementation it's using — that's the power of DI.

### Interface Segregation

DJ.ai defines focused interfaces for each concern:

```csharp
// Secret management
public interface ISecretService
{
    Task<string> GetSecretAsync(string secretName);
}

// Device authentication & rate limiting
public interface IDeviceAuthService
{
    Task<bool> ValidateAsync(string deviceToken);
    Task CheckAndRecordRequestAsync(string deviceToken);
}

// OAuth state management
public interface IStateStoreService
{
    Task StoreStateAsync(string state, string provider, TimeSpan expiry);
    Task<string?> GetAndRemoveStateAsync(string state);
}

// Input validation
public interface IValidationService
{
    bool IsValidRedirectUri(string uri);
}
```

### Constructor Injection

The recommended pattern — declare dependencies as constructor parameters:

```csharp
public class YouTubeOAuthFunctions
{
    private readonly ISecretService _secretService;
    private readonly IDeviceAuthService _deviceAuth;
    private readonly IStateStoreService _stateStore;
    private readonly IValidationService _validation;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<YouTubeOAuthFunctions> _logger;

    public YouTubeOAuthFunctions(
        ISecretService secretService,
        IDeviceAuthService deviceAuth,
        IStateStoreService stateStore,
        IValidationService validation,
        IHttpClientFactory httpClientFactory,
        ILogger<YouTubeOAuthFunctions> logger)
    {
        _secretService = secretService;
        _deviceAuth = deviceAuth;
        _stateStore = stateStore;
        _validation = validation;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }
}
```

### Registering HttpClient

`IHttpClientFactory` is registered via `AddHttpClient()` and provides managed HTTP connections for calling external APIs (Spotify, Google, Apple):

```csharp
services.AddHttpClient(); // Registers IHttpClientFactory as singleton
```

---

## 🔗 DJ.ai Connection

- **`oauth-proxy/Program.cs`** — All DI registration happens here: `AddSingleton`, `AddMemoryCache`, `AddHttpClient`, conditional service selection based on environment
- **`oauth-proxy/Functions/SpotifyOAuthFunctions.cs`** — Constructor injection of 6 dependencies
- **`oauth-proxy/Functions/AppleMusicOAuthFunctions.cs`** — Same pattern plus JWT token caching
- **`oauth-proxy/Services/KeyVaultSecretService.cs`** — Implements `ISecretService` with Key Vault client injected via constructor
- **`oauth-proxy/Services/RedisDeviceAuthService.cs`** — Implements `IDeviceAuthService` with Redis connection multiplexer
- **`DJai.ServiceDefaults/Extensions.cs`** — Aspire service defaults (telemetry, health checks) registered as DI extensions

---

## 🎯 Key Takeaways

- DI **inverts control** — classes don't create their dependencies; they receive them
- **Singleton** is the default lifetime in DJ.ai (stateless services or thread-safe caching)
- **Conditional registration** lets you swap implementations without changing function code (stubs, local secrets, Key Vault)
- **Constructor injection** is the standard pattern — all dependencies are explicit and testable
- **`IHttpClientFactory`** manages HTTP connections efficiently (pooling, DNS rotation)
- The same DI patterns used in the C# backend are mirrored in DJ.ai's TypeScript DI container (`electron-app/src/config/container.ts`)

---

## 📖 Resources

- [Dependency Injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection) — Official guide
- [Service Lifetimes](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#service-lifetimes) — Singleton vs Scoped vs Transient
- [Dependency Injection in Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection) — Functions-specific DI
- [IHttpClientFactory](https://learn.microsoft.com/en-us/dotnet/core/extensions/httpclient-factory) — Managed HTTP connections
