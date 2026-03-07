# Dependency Injection

## The Concept

**Dependency Injection (DI)** is a design pattern where components receive their dependencies from the outside rather than creating them internally. Instead of a class instantiating its own database connection, the connection is "injected" — passed in via constructor, method parameter, or a DI container.

```typescript
// ❌ Hard-coded dependency (tightly coupled)
class MusicPlayer {
  private provider = new SpotifyProvider();
}

// ✅ Injected dependency (loosely coupled)
class MusicPlayer {
  constructor(private provider: IMusicProvider) {}
}
```

### Why DI Matters

1. **Testability** — Swap real services for mocks during testing
2. **Flexibility** — Change implementations without modifying consumers
3. **Separation of concerns** — Components focus on their job, not wiring
4. **Configuration** — Switch between dev/staging/prod services easily

## DI in DJ.ai's Frontend (TypeScript)

DJ.ai uses a simple DI container in `electron-app/src/config/container.ts`:

```typescript
// Simplified container concept
const container = {
  musicProvider: createMusicProvider(selectedProvider),
  ttsService: createTTSService(config),
  aiService: createAIService(config),
};

// Components receive dependencies
function App() {
  const { musicProvider, ttsService } = useContainer();
  // Uses whatever implementation was configured
}
```

### Test Mode Injection

When `?test=true` is in the URL, the container injects mock implementations:

```typescript
const musicProvider = isTestMode
  ? new MockMusicProvider()
  : new SpotifyProvider(config);
```

## DI in DJ.ai's Backend (C#)

The .NET backend uses the built-in DI container in `oauth-proxy/Program.cs`:

```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        // Register services with their interfaces
        services.AddSingleton<ISecretService, KeyVaultSecretService>();
        services.AddSingleton<IDeviceAuthService, RedisDeviceAuthService>();
        services.AddSingleton<IStateStoreService, RedisStateStoreService>();
    })
    .Build();
```

Functions receive dependencies via constructor injection:

```csharp
public class SpotifyOAuthFunctions
{
    private readonly ISecretService _secretService;

    public SpotifyOAuthFunctions(ISecretService secretService)
    {
        _secretService = secretService;  // Injected by container
    }

    [Function("spotify-oauth-initiate")]
    public async Task<HttpResponseData> Initiate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req)
    {
        var clientSecret = await _secretService.GetSecretAsync("Spotify-ClientSecret");
        // ...
    }
}
```

## DJ.ai Connection

DI appears at both layers of DJ.ai. The frontend container in `electron-app/src/config/` wires up providers, AI services, and TTS services — with test mode swapping in mocks. The backend `Program.cs` registers `ISecretService`, `IDeviceAuthService`, and `IStateStoreService` implementations. This makes both layers testable and configurable without code changes.

## Key Takeaways

- DI makes code testable by allowing mock injection
- Program to interfaces (`IMusicProvider`, `ISecretService`), not concrete classes
- Both TypeScript and C# support DI — the concept is universal
- Test mode is a perfect DI use case: swap real services for mocks at the container level

## Further Reading

- [Martin Fowler: Inversion of Control and Dependency Injection](https://martinfowler.com/articles/injection.html)
- [.NET Dependency Injection](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
- [TypeScript DI Patterns](https://www.typescriptlang.org/docs/handbook/interfaces.html)
