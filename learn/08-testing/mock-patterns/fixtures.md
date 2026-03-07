# Test Fixtures

## Concept

A **test fixture** is any fixed state or data used as a baseline for running tests. Fixtures can be as simple as a hardcoded string or as complex as a pre-configured database. The goal is to create a **known, repeatable starting state** so that tests are deterministic and isolated.

## Types of Fixtures

### 1. Object Fixtures (Inline Data)

```typescript
// Simple object fixture
const mockTrack: Track = {
  id: '123',
  name: 'Get Lucky',
  artist: 'Daft Punk',
  album: 'Random Access Memories',
  albumArtUrl: 'https://example.com/art.jpg',
  durationMs: 369000,
  serviceUrl: 'https://music.apple.com/track/123'
};
```

### 2. File Fixtures (Test Assets)

Physical files used during testing:

```
electron-app/src/test-fixtures/
├── silence-1s.mp3      # 1-second silent audio (MP3)
└── silence-1s.wav      # 1-second silent audio (WAV)
```

### 3. Class Fixtures (Shared Setup)

```csharp
// C# — FunctionTestBase provides shared infrastructure
public class FunctionTestBase
{
    protected readonly MockSecretService MockSecretService;
    protected readonly Mock<IStateStoreService> MockStateStore;
    protected readonly Mock<IDeviceAuthService> MockDeviceAuth;

    protected FunctionTestBase()
    {
        MockSecretService = new MockSecretService();
        MockStateStore = new Mock<IStateStoreService>();
        MockDeviceAuth = new Mock<IDeviceAuthService>();
    }
}
```

## How DJ.ai Uses Fixtures

### Audio Test Fixtures

The `silence-1s.mp3` and `silence-1s.wav` files in `electron-app/src/test-fixtures/` provide real audio data for TTS and playback tests without requiring network access or audio generation:

```typescript
import silenceMp3 from '../test-fixtures/silence-1s.mp3';

test('plays audio file', async () => {
  const audio = new Audio(silenceMp3);
  await audio.play();
  expect(audio.play).toHaveBeenCalled();
});
```

### MockTTSService — Spy + Stub with Call Tracking

```typescript
class MockTTSService implements ITTSService {
  public speakCalls: string[] = [];
  public shouldError = false;

  async speak(text: string): Promise<void> {
    this.speakCalls.push(text);  // Track calls (spy behavior)
    if (this.shouldError) {
      throw new Error('TTS error');  // Error injection
    }
  }

  reset() {
    this.speakCalls = [];
    this.shouldError = false;
  }
}
```

This fixture provides:
- **Call tracking** — `speakCalls` array records what was spoken
- **Error injection** — `shouldError` flag triggers failure scenarios
- **Reset** — Clean state between tests

### FunctionTestBase — Shared Backend Fixture

```csharp
public class SpotifyOAuthFunctionsTests : FunctionTestBase
{
    private readonly SpotifyOAuthFunctions _functions;

    public SpotifyOAuthFunctionsTests()
    {
        // FunctionTestBase provides MockSecretService, MockStateStore, etc.
        MockSecretService.SetSecret("spotify-client-id", "test-id");
        MockSecretService.SetSecret("spotify-client-secret", "test-secret");

        MockDeviceAuth.Setup(d => d.ValidateDeviceToken(It.IsAny<string>()))
            .ReturnsAsync(true);

        MockStateStore.Setup(s => s.ConsumeState(It.IsAny<string>()))
            .ReturnsAsync(true);

        _functions = new SpotifyOAuthFunctions(
            MockSecretService,
            MockStateStore.Object,
            MockDeviceAuth.Object,
            CreateMockHttpClientFactory()
        );
    }
}
```

### Apple Music: Real Cryptographic Fixtures

Apple Music tests generate real EC keys as test fixtures:

```csharp
private readonly ECDsa _testKey;
private readonly string _testKeyPem;

public AppleMusicOAuthFunctionsTests()
{
    // Generate real P-256 key for JWT testing
    _testKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
    _testKeyPem = ExportPrivateKeyAsPem(_testKey);

    MockSecretService.SetSecret("apple-music-private-key", _testKeyPem);
    MockSecretService.SetSecret("apple-music-team-id", "TEAM123");
    MockSecretService.SetSecret("apple-music-key-id", "KEY123");
}
```

## Setup and Teardown Patterns

### Vitest

```typescript
beforeEach(() => {
  // Fresh fixture for each test
  mockProvider = createMockProvider();
  vi.mocked(fetch).mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
```

### xUnit

```csharp
// Constructor = setup (new instance per test)
public MyTests()
{
    _fixture = new TestFixture();
}

// IDisposable = teardown
public void Dispose()
{
    _fixture.Cleanup();
}
```

## Key Takeaways

- Fixtures create known, repeatable test states — essential for deterministic tests
- File fixtures (silence-1s.mp3) avoid network calls for audio testing
- Class fixtures (FunctionTestBase) share setup logic without sharing mutable state
- Call-tracking fixtures (MockTTSService) combine spy and stub patterns
- Real cryptographic fixtures (EC keys) test JWT logic without mocking crypto

## DJ.ai Connection

DJ.ai's fixtures span the spectrum — from simple inline objects to real cryptographic key generation. The `FunctionTestBase` pattern is especially effective: it provides common mock setup for all OAuth function tests while xUnit's per-test instantiation ensures isolation. The audio fixture files (`silence-1s.mp3/wav`) are a practical detail that makes TTS and playback tests possible without network access.

## Further Reading

- [Test Fixture (Wikipedia)](https://en.wikipedia.org/wiki/Test_fixture)
- [xUnit Shared Context](https://xunit.net/docs/shared-context)
- [Vitest Setup Files](https://vitest.dev/config/#setupfiles)
