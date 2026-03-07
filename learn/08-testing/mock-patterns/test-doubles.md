# Test Doubles — Dummy, Stub, Spy, Mock, Fake

## Concept

A **test double** is any object that stands in for a real dependency during testing. There are five types, each serving a different purpose. Knowing which to use — and when — prevents over-mocking and keeps tests meaningful.

## The Five Types

### 1. Dummy

An object passed to satisfy a parameter requirement but never actually used.

```typescript
// Dummy — the logger is required but never called in this test path
const dummyLogger = {} as ILogger;
const service = new ValidationService(dummyLogger);
service.validateUri('http://localhost:5173');
```

### 2. Stub

An object that returns predetermined responses. It doesn't track calls or verify interactions.

```typescript
// Stub — returns a fixed response, no tracking
vi.mocked(fetch).mockResolvedValue(
  new Response(JSON.stringify({ tracks: { items: [] } }))
);
```

```csharp
// C# Stub with Moq
mockSecretService
    .Setup(s => s.GetSecretAsync("client-id"))
    .ReturnsAsync("test-client-id");
```

### 3. Spy

An object that records information about how it was used (call count, arguments) while optionally delegating to the real implementation.

```typescript
// Spy — wraps real fetch, records calls
const fetchSpy = vi.spyOn(global, 'fetch');
await provider.searchTracks('daft punk');

expect(fetchSpy).toHaveBeenCalledWith(
  expect.stringContaining('/v1/search'),
  expect.any(Object)
);
```

### 4. Mock

An object pre-programmed with expectations — it verifies that specific interactions occurred.

```csharp
// Mock — verifies interaction happened
var mockDeviceAuth = new Mock<IDeviceAuthService>();
mockDeviceAuth
    .Setup(d => d.ValidateDeviceToken(It.IsAny<string>()))
    .ReturnsAsync(true);

// ... run the code ...

// Verify the interaction
mockDeviceAuth.Verify(
    d => d.ValidateDeviceToken("device-123"),
    Times.Once()
);
```

### 5. Fake

A working implementation with simplified behavior — faster or simpler than the real thing.

```csharp
// Fake — real dictionary behind the interface
public class MockSecretService : ISecretService
{
    private readonly Dictionary<string, string> _secrets = new();

    public void SetSecret(string key, string value) => _secrets[key] = value;

    public Task<string> GetSecretAsync(string key) =>
        _secrets.TryGetValue(key, out var value)
            ? Task.FromResult(value)
            : throw new KeyNotFoundException(key);
}
```

```typescript
// Fake — in-memory localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: (key: string) => localStorageMock.store[key] ?? null,
  setItem: (key: string, value: string) => { localStorageMock.store[key] = value; },
  removeItem: (key: string) => { delete localStorageMock.store[key]; },
  clear: () => { localStorageMock.store = {}; }
};
```

## Comparison

| Type | Returns Values | Tracks Calls | Verifies Calls | Has Logic |
|------|:-:|:-:|:-:|:-:|
| Dummy | ❌ | ❌ | ❌ | ❌ |
| Stub | ✅ | ❌ | ❌ | ❌ |
| Spy | ✅ (real or fake) | ✅ | ❌ | Optional |
| Mock | ✅ | ✅ | ✅ | ❌ |
| Fake | ✅ | ❌ | ❌ | ✅ |

## How DJ.ai Uses Each Type

| Double | Type | Used In | Purpose |
|--------|------|---------|---------|
| `MockTTSService` | Spy + Stub | Frontend tests | Tracks TTS calls, returns controlled results |
| `MockAICommentaryService` | Spy + Stub | Frontend tests | Records commentary requests |
| `MockSecretService` | Fake | Backend tests | Real dictionary, simulates Key Vault |
| `TestHttpMessageHandler` | Stub | Backend tests | Returns predetermined HTTP responses |
| `Mock<IDatabase>` | Mock | Redis tests | Verifies Redis operations occurred |
| `localStorage` mock | Fake | Frontend tests | In-memory storage with real behavior |

## When to Use Each

1. **Dummy** — When a parameter is required but irrelevant to the test
2. **Stub** — When you need controlled return values from a dependency
3. **Spy** — When you need to verify calls AND test real behavior
4. **Mock** — When verifying interactions is the primary assertion (use sparingly)
5. **Fake** — When a simplified working implementation is more practical than stubbing every method

## Key Takeaways

- Fakes are the most robust doubles — they catch bugs that stubs miss
- Stubs are the most common doubles — quick to set up, good enough for most cases
- Mocks (with Verify) should be used sparingly — prefer asserting outputs over verifying calls
- Spies give you the best of both worlds — real behavior with call tracking
- DJ.ai's `MockSecretService` is a great example of a fake over a mock

## DJ.ai Connection

DJ.ai uses all five types of test doubles across frontend and backend. The key insight is that fakes (like `MockSecretService` and the `localStorage` mock) catch more bugs than pure stubs because they have real behavior — if the code interacts with them incorrectly, the fake behaves differently from expected, exposing the bug.

## Further Reading

- [Test Double (Martin Fowler)](https://martinfowler.com/bliki/TestDouble.html)
- [Fakes, Mocks, and Stubs (Pragmatists)](https://blog.pragmatists.com/test-doubles-fakes-mocks-and-stubs-1a7491dfa3da)
- [Mocks Aren't Stubs (Martin Fowler)](https://martinfowler.com/articles/mocksArentStubs.html)
