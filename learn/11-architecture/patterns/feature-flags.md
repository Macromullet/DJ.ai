# Feature Flags & Test Mode

## The Concept

**Feature flags** (also called feature toggles) are runtime switches that change application behavior without deploying new code. They enable:

- **Testing** — Activate mock services for automated tests
- **Gradual rollouts** — Enable features for a percentage of users
- **Kill switches** — Disable a broken feature without redeploying
- **A/B testing** — Compare different implementations

The simplest form is a boolean check:

```typescript
if (featureFlags.newPlayer) {
  return <NewMusicPlayer />;
} else {
  return <ClassicMusicPlayer />;
}
```

## DJ.ai's Test Mode

DJ.ai uses a URL-based feature flag for end-to-end testing. Adding `?test=true` to the URL activates **test mode**, which swaps real services for predictable mock implementations:

```typescript
// Check for test mode
const urlParams = new URLSearchParams(window.location.search);
const isTestMode = urlParams.get('test') === 'true';
```

### What Test Mode Changes

| Service | Production | Test Mode |
|---------|-----------|-----------|
| Music Provider | `YouTubeMusicProvider` | `MockMusicProvider` |
| TTS Service | `GeminiTTSService` | `MockTTSService` |
| AI Commentary | `GeminiAIService` | `MockAIService` |

### Mock Implementations

Mocks return predictable, deterministic data — no API keys, no network calls, no flaky responses:

```typescript
class MockMusicProvider implements IMusicProvider {
  async searchTracks(query: string): Promise<SearchResult[]> {
    return [
      { title: 'Test Track 1', artist: 'Test Artist', id: 'mock-1' },
      { title: 'Test Track 2', artist: 'Test Artist', id: 'mock-2' },
    ];
  }

  async authenticate(): Promise<void> {
    // Instantly "authenticated" — no OAuth flow needed
    this.authenticated = true;
  }
}

class MockTTSService implements ITTSService {
  async speak(text: string): Promise<void> {
    // Return silence or a pre-recorded audio clip
    return;
  }
}
```

### Why This Pattern?

1. **Playwright tests** can run without real OAuth tokens or API keys
2. **Development** can proceed without provider accounts configured
3. **Demos** work reliably without depending on external services
4. **CI/CD** pipelines don't need secret configuration for test jobs

## DJ.ai Connection

Test mode is activated by loading the app with `?test=true` in the URL. The DI container in `electron-app/src/config/` checks this flag and injects mock implementations for all external services. This allows Playwright E2E tests to exercise the full UI — onboarding, search, playback, settings — without any real API connections. The mock services in `electron-app/src/services/` return consistent, predictable data.

## Key Takeaways

- Feature flags decouple deployment from feature activation
- Test mode swaps all external dependencies for mocks via DI
- Mocks return deterministic data — tests are reliable and fast
- URL-based flags are simple for development; production apps use remote config

## Further Reading

- [Martin Fowler: Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [LaunchDarkly: Feature Flag Best Practices](https://launchdarkly.com/blog/feature-flag-best-practices/)
