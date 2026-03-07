# Vitest Async Testing

## Concept

Modern JavaScript is heavily asynchronous — promises, `async/await`, timers, and microtasks are everywhere. Testing async code requires understanding JavaScript's event loop and how Vitest integrates with it. Getting this wrong leads to tests that pass even when the async code is broken, or tests that hang indefinitely.

## Testing Promises and async/await

### Basic async Test

```typescript
test('searchTracks returns results', async () => {
  vi.mocked(fetch).mockResolvedValue(mockResponse);

  const results = await provider.searchTracks('query');

  expect(results).toHaveLength(3);
  expect(results[0].name).toBe('Song A');
});
```

Vitest automatically waits for the returned promise to resolve. If it rejects, the test fails.

### Testing Rejections

```typescript
test('searchTracks throws on network error', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

  await expect(provider.searchTracks('query'))
    .rejects.toThrow('Network error');
});
```

## Fake Timers

When code uses `setTimeout`, `setInterval`, or `Date.now()`, fake timers give you control:

```typescript
test('token refresh happens after timeout', async () => {
  vi.useFakeTimers();

  provider.startAutoRefresh();

  // Advance time by 55 minutes (token expires at 60)
  vi.advanceTimersByTime(55 * 60 * 1000);

  expect(refreshSpy).toHaveBeenCalled();

  vi.useRealTimers(); // Always restore!
});
```

### Timer Methods

| Method | Purpose |
|--------|---------|
| `vi.useFakeTimers()` | Replace real timers with fakes |
| `vi.useRealTimers()` | Restore real timers |
| `vi.advanceTimersByTime(ms)` | Fast-forward by milliseconds |
| `vi.advanceTimersToNextTimer()` | Advance to next scheduled timer |
| `vi.runAllTimers()` | Execute all pending timers |
| `vi.runOnlyPendingTimers()` | Execute currently scheduled timers (not new ones) |

## Flushing Microtasks

Some async operations use microtasks (`queueMicrotask`, `Promise.resolve().then(...)`) that need explicit flushing:

```typescript
test('TTS completes after microtask', async () => {
  const ttsService = new BrowserTTSService();
  ttsService.speak('Hello world');

  // Flush microtask queue to let the async audio completion fire
  await new Promise(resolve => queueMicrotask(resolve));

  expect(ttsService.isSpeaking).toBe(false);
});
```

### How DJ.ai Uses This

In DJ.ai's TTS tests, `queueMicrotask` is used to simulate async audio completion events. The `SpeechSynthesisUtterance` mock fires `onend` via microtask, requiring tests to flush the queue before asserting:

```typescript
// Pattern from DJ.ai TTS tests
await act(async () => {
  ttsService.speak('Commentary text');
  await new Promise(resolve => queueMicrotask(resolve));
});

expect(mockOnEnd).toHaveBeenCalled();
```

## waitFor and Polling

For operations that complete "eventually" (DOM updates, debounced operations):

```typescript
import { waitFor } from '@testing-library/react';

test('search results appear after debounce', async () => {
  await userEvent.type(searchInput, 'daft punk');

  await waitFor(() => {
    expect(screen.getByText('Get Lucky')).toBeInTheDocument();
  });
});
```

`waitFor` polls the assertion until it passes or times out (default 1000ms).

## Common Async Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Missing `await` | Test passes before async work completes | Always `await` async operations |
| Not flushing microtasks | Assertions run before callbacks fire | `await new Promise(r => queueMicrotask(r))` |
| Fake timers + promises | Promises don't resolve with fake timers | Use `vi.advanceTimersByTimeAsync()` |
| Not restoring real timers | Subsequent tests break | `vi.useRealTimers()` in `afterEach` |

## Key Takeaways

- Always `await` async operations before asserting
- Use fake timers for time-dependent code, but always restore them
- Flush microtasks explicitly when testing microtask-based callbacks
- `waitFor` from RTL handles DOM updates that happen "eventually"
- Vitest's async handling is Jest-compatible — most patterns transfer directly

## DJ.ai Connection

Async testing is essential in DJ.ai because nearly everything is async: OAuth flows, API calls, playback control, TTS synthesis. The TTS test suite demonstrates the microtask flushing pattern, while provider tests exercise `async/await` chains that include token refresh, API calls, and response mapping.

## Further Reading

- [Vitest Timer Mocks](https://vitest.dev/guide/migration#timer-mocks)
- [Testing Async Code (Vitest)](https://vitest.dev/guide/features#testing-async-code)
- [JavaScript Event Loop (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
