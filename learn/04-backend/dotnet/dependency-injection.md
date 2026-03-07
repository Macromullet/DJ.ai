# Dependency Injection in .NET

## What Is Dependency Injection?

Dependency Injection (DI) is a design pattern where objects receive their dependencies from an external source rather than creating them internally. Instead of a class doing `new SecretService()`, the DI container provides an `ISecretService` — making the code testable, flexible, and loosely coupled.

.NET has a built-in DI container (`IServiceCollection`) that handles service registration and resolution.

## Service Lifetimes

| Lifetime | Behavior | Use For |
|----------|----------|---------|
| **Singleton** | One instance for the app's lifetime | Stateless services, caches, clients |
| **Scoped** | One instance per request/scope | Database contexts, per-request state |
| **Transient** | New instance every time | Lightweight stateless services |

```csharp
// Singleton — one shared instance
services.AddSingleton<ISecretService, KeyVaultSecretService>();

// Scoped — new instance per HTTP request
services.AddScoped<IUserContext, UserContext>();

// Transient — new instance every injection
services.AddTransient<IValidator, InputValidator>();
```

## Registration in DJ.ai

DJ.ai's `oauth-proxy/Program.cs` registers all services in the `ConfigureServices` callback:

```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.AddMemoryCache();

        // Conditional registration based on environment
        var isLocal = context.Configuration["AZURE_FUNCTIONS_ENVIRONMENT"] == "Development";
        var useStubs = context.Configuration["USE_STUB_SECRETS"] == "true";

        if (useStubs)
            services.AddSingleton<ISecretService, StubSecretService>();
        else if (isLocal)
            services.AddSingleton<ISecretService, LocalSecretService>();
        else
            services.AddSingleton<ISecretService, KeyVaultSecretService>();

        // Always register these
        services.AddSingleton<IStateStoreService, RedisStateStoreService>();
        services.AddSingleton<IDeviceAuthService, RedisDeviceAuthService>();
        services.AddSingleton<IValidationService, ValidationService>();
        services.AddHttpClient();
    })
    .Build();
```

### Why Conditional Registration?

The same `ISecretService` interface has three implementations:
- **`KeyVaultSecretService`** — production (reads from Azure Key Vault)
- **`LocalSecretService`** — development (reads from `dotnet user-secrets` or environment variables)
- **`StubSecretService`** — testing (returns hardcoded stub values)

Functions receive `ISecretService` and don't know which implementation they're using — the DI container handles it.

## Constructor Injection

Azure Function classes receive dependencies via constructor parameters:

```csharp
public class SpotifyOAuthFunctions
{
    private readonly ISecretService _secretService;
    private readonly IDeviceAuthService _deviceAuthService;
    private readonly IValidationService _validationService;
    private readonly IStateStoreService _stateStore;

    public SpotifyOAuthFunctions(
        ISecretService secretService,
        IDeviceAuthService deviceAuthService,
        IValidationService validationService,
        IStateStoreService stateStore)
    {
        _secretService = secretService;
        _deviceAuthService = deviceAuthService;
        _validationService = validationService;
        _stateStore = stateStore;
    }
}
```

## Key Links

- [Dependency Injection in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [Service Lifetimes](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection#service-lifetimes)

## Key Takeaways

- DI separates **what** a class needs from **how** it's created
- Register services with appropriate **lifetimes** (Singleton for stateless, Scoped for per-request)
- **Conditional registration** lets the same interface serve different environments
- Constructor injection makes dependencies **explicit and testable**

## DJ.ai Connection

All service wiring happens in `oauth-proxy/Program.cs`. Every Azure Function class (`SpotifyOAuthFunctions`, `AppleMusicOAuthFunctions`) receives four injected services: `ISecretService` for client secrets, `IDeviceAuthService` for rate limiting, `IValidationService` for input validation, and `IStateStoreService` for CSRF state management. The conditional registration pattern means developers can run the full stack locally with `dotnet user-secrets` without needing Azure Key Vault access.
