# Vitest Mocking

## Concept

Mocking replaces real dependencies with controlled test doubles. Vitest provides three primary mocking tools: `vi.mock()` for module-level replacement, `vi.fn()` for standalone mock functions, and `vi.spyOn()` for wrapping existing methods. Used correctly, mocks isolate the code under test from external boundaries.

**Critical rule:** Mock at boundaries (fetch, localStorage, file system), not the code you're testing. See [Anti-Tautology Testing](../philosophy/anti-tautology.md).

## vi.fn() — Mock Functions

Creates a standalone mock function with call tracking:

```typescript
const mockCallback = vi.fn();
mockCallback('hello');

expect(mockCallback).toHaveBeenCalledWith('hello');
expect(mockCallback).toHaveBeenCalledTimes(1);

// With return value
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
```

## vi.mock() — Module Mocking

Replaces an entire module import:

```typescript
// Replace the entire module
vi.mock('./services/ttsService', () => ({
  speak: vi.fn().mockResolvedValue(undefined),
  getVoices: vi.fn().mockReturnValue([])
}));

// Now any import of './services/ttsService' gets the mock
import { speak } from './services/ttsService';
// speak is actually vi.fn()
```

### Auto-Mocking

```typescript
// Vitest can auto-mock all exports
vi.mock('./services/ttsService');
// All exports become vi.fn() with undefined return
```

## vi.spyOn() — Spy on Existing Methods

Wraps an existing method, preserving the original implementation while tracking calls:

```typescript
// Spy on fetch without changing behavior
const fetchSpy = vi.spyOn(global, 'fetch');
await provider.searchTracks('test');
expect(fetchSpy).toHaveBeenCalledWith(
  expect.stringContaining('/v1/search'),
  expect.any(Object)
);

// Spy AND replace implementation
vi.spyOn(global, 'fetch').mockResolvedValue(
  new Response(JSON.stringify(mockData))
);
```

## How DJ.ai Uses Mocking

### Global Mocks (vitest.setup.ts)

DJ.ai configures boundary mocks globally in `electron-app/vitest.setup.ts`:

```typescript
// Electron preload API — the boundary between renderer and main process
Object.defineProperty(window, 'electron', {
  value: {
    aiProxy: { request: vi.fn() },
    tts: { speak: vi.fn() },
    oauth: { openExternal: vi.fn() }
  }
});

// Audio playback — browser API boundary
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn()
}));

// Network — the classic boundary mock
global.fetch = vi.fn();

// Speech synthesis — browser API boundary
window.SpeechSynthesisUtterance = vi.fn();
```

### Per-Test Mocks

Individual tests configure specific mock behavior:

```typescript
test('searchTracks maps Spotify response correctly', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({
      tracks: { items: [{ id: '123', name: 'Song' }] }
    }))
  );

  const results = await provider.searchTracks('query');
  expect(results[0].name).toBe('Song');
});
```

### Mock Reset

```typescript
afterEach(() => {
  vi.clearAllMocks();    // Clears call history and implementations
  // vi.restoreAllMocks(); // Also restores original implementations (spyOn)
  // vi.resetAllMocks();   // Resets to vi.fn() with no implementation
});
```

## Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Mocking the method under test | Tautological test | Mock boundaries, not the code being tested |
| Forgetting cleanup | State leaks between tests | Use `afterEach(() => vi.clearAllMocks())` |
| Over-mocking | Tests don't exercise real code | Mock only external boundaries |
| `mockReturnValue` vs `mockResolvedValue` | Wrong for async functions | Use `mockResolvedValue` for promises |

## Key Takeaways

- `vi.fn()` for standalone mocks, `vi.spyOn()` for wrapping existing methods, `vi.mock()` for modules
- Mock boundaries (fetch, Audio, localStorage), not the code under test
- Global mocks in `vitest.setup.ts` simulate the Electron environment
- Always clean up mocks in `afterEach` to prevent state leakage

## DJ.ai Connection

DJ.ai's mock strategy follows the anti-tautology principle: `vitest.setup.ts` mocks the boundaries (Electron IPC, browser Audio, fetch, SpeechSynthesis), while tests exercise real provider and component code. This ensures tests catch mapping bugs, state management errors, and logic flaws — not just mock configurations.

## Further Reading

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking)
- [vi.mock() API](https://vitest.dev/api/vi#vi-mock)
- [vi.spyOn() API](https://vitest.dev/api/vi#vi-spyon)
