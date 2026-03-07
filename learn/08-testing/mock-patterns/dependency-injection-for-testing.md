# Dependency Injection for Testing

## Concept

**Dependency Injection (DI)** is a design pattern where objects receive their dependencies from the outside rather than creating them internally. This simple idea has profound implications for testability: if dependencies are injected, they can be replaced with test doubles during testing.

Without DI, code creates its own dependencies — making them impossible to mock:

```typescript
// ❌ Hard to test — creates its own fetch dependency
class SpotifyProvider {
  async search(query: string) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${query}`);
    return response.json();
  }
}
```

With DI, dependencies are provided from outside:

```typescript
// ✅ Testable — fetch is injectable
class SpotifyProvider {
  constructor(private httpClient: typeof fetch) {}

  async search(query: string) {
    const response = await this.httpClient(`https://api.spotify.com/v1/search?q=${query}`);
    return response.json();
  }
}
```

## DI in DJ.ai's Frontend

### The DI Container

`electron-app/src/config/container.ts` implements a simple DI container:

```typescript
interface ServiceContainer {
  musicProvider: IMusicProvider;
  ttsService: ITTSService;
  aiCommentaryService?: IAICommentaryService;
}

class DIContainer {
  private services = new Map<string, unknown>();

  register<K extends keyof ServiceContainer>(
    key: K,
    service: ServiceContainer[K]
  ): void {
    this.services.set(key, service);
  }

  get<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] {
    const service = this.services.get(key);
    if (!service) throw new Error(`Service ${key} not registered`);
    return service as ServiceContainer[K];
  }

  clear(): void {
    this.services.clear();  // Essential for testing!
  }
}
```

### Production Registration

```typescript
// Production code registers real implementations
container.register('musicProvider', new AppleMusicProvider(config));
container.register('ttsService', new BrowserTTSService());
```

### Test Registration

```typescript
// Tests register mocks/fakes
container.clear();
container.register('musicProvider', mockProvider);
container.register('ttsService', new MockTTSService());
```

The `clear()` method is critical — it prevents state from leaking between tests.

## DI in DJ.ai's Backend

### Program.cs — Service Registration

```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices(services =>
    {
        services.AddSingleton<ISecretService, KeyVaultSecretService>();
        services.AddSingleton<IStateStoreService, RedisStateStoreService>();
        services.AddSingleton<IDeviceAuthService, RedisDeviceAuthService>();
        services.AddHttpClient();
    })
    .Build();
```

### Constructor Injection in Functions

```csharp
public class SpotifyOAuthFunctions
{
    private readonly ISecretService _secretService;
    private readonly IStateStoreService _stateStore;
    private readonly IDeviceAuthService _deviceAuth;
    private readonly IHttpClientFactory _httpClientFactory;

    public SpotifyOAuthFunctions(
        ISecretService secretService,
        IStateStoreService stateStore,
        IDeviceAuthService deviceAuth,
        IHttpClientFactory httpClientFactory)
    {
        _secretService = secretService;
        _stateStore = stateStore;
        _deviceAuth = deviceAuth;
        _httpClientFactory = httpClientFactory;
    }
}
```

### Test Injection

```csharp
// Tests inject mocks through the same constructor
var functions = new SpotifyOAuthFunctions(
    mockSecretService,              // MockSecretService (fake)
    mockStateStore.Object,          // Moq mock
    mockDeviceAuth.Object,          // Moq mock
    mockHttpClientFactory.Object    // Moq mock
);
```

## The Testability Connection

DI enables testing by making dependencies **swappable**:

| Without DI | With DI |
|------------|---------|
| `new KeyVaultSecretService()` inside function | `ISecretService` injected via constructor |
| `fetch()` global call | Mockable `fetch` or `IHttpClient` |
| `new Audio()` direct construction | Audio constructor mockable in setup |
| Untestable (needs real Azure) | Fully testable (mocks injected) |

## Interface-Based Design

DI works because of **interfaces** — the contract between the code and its dependencies:

```
Code depends on:    ISecretService      (interface)
Production uses:    KeyVaultSecretService  (real implementation)
Tests use:          MockSecretService      (fake implementation)
```

Both implement the same interface, so the code can't tell the difference.

## Key Takeaways

- DI separates "what to use" (interface) from "how to create it" (implementation)
- Both frontend (`container.ts`) and backend (`Program.cs`) use DI — the pattern is universal
- `clear()` on the frontend container and per-test instantiation on the backend prevent state leakage
- Without DI, testing requires real Azure Key Vault, real Redis, real HTTP — slow, expensive, flaky

## DJ.ai Connection

DI is the foundation that makes DJ.ai's entire test suite possible. The frontend container manages `IMusicProvider`, `ITTSService`, and `IAICommentaryService` — all swappable for testing. The backend uses .NET's built-in DI to inject `ISecretService`, `IStateStoreService`, and `IDeviceAuthService`. This symmetry means the same testing principles apply across the full stack.

## Further Reading

- [Dependency Injection (Martin Fowler)](https://martinfowler.com/articles/injection.html)
- [SOLID Principles — Dependency Inversion](https://en.wikipedia.org/wiki/Dependency_inversion_principle)
- [.NET Dependency Injection](https://learn.microsoft.com/en-us/dotnet/core/extensions/dependency-injection)
