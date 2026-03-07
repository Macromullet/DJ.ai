# useEffect

> Side effects, cleanup, and dependency arrays — managing the outside world from React components.

`useEffect` lets you synchronize your component with external systems: APIs, subscriptions, timers, localStorage, and Electron IPC. DJ.ai uses `useEffect` extensively — for token refresh timers, localStorage sync, auto-DJ lookahead pre-generation, keyboard shortcut registration, and Electron tray callback wiring.

---

## Core Concepts

### Basic useEffect

`useEffect` runs **after** the component renders. It takes a function (the effect) and an optional dependency array:

```typescript
useEffect(() => {
  // Effect runs after render
  document.title = `Now Playing: ${currentTrack?.name ?? 'DJ.ai'}`;
}, [currentTrack]); // Only re-run when currentTrack changes
```

### Dependency Array

The second argument controls when the effect re-runs:

| Dependency Array | Behavior |
|------------------|----------|
| **Omitted** | Runs after every render (rarely wanted) |
| **`[]`** (empty) | Runs once on mount, cleanup on unmount |
| **`[a, b]`** | Runs when `a` or `b` changes (referential comparison) |

```typescript
// Runs ONCE on mount — register Electron tray callbacks
useEffect(() => {
  window.electron.tray.onPlaybackToggle(() => {
    setIsPlaying(prev => !prev);
  });
}, []);

// Runs when `isPlaying` changes — sync ref to avoid stale closures
useEffect(() => {
  isPlayingRef.current = isPlaying;
}, [isPlaying]);

// Runs when `settings` changes — persist to localStorage
useEffect(() => {
  localStorage.setItem('dj-ai-settings', JSON.stringify(settings));
}, [settings]);
```

### Cleanup Function

Return a function from the effect to clean up resources. React calls it before the next effect runs and when the component unmounts:

```typescript
// Auto-DJ polling with cleanup
useEffect(() => {
  if (!autoDJMode || !isPlaying) return;

  const intervalId = setInterval(() => {
    // Pre-generate commentary for next track
    preGenerateNextTrackContent();
  }, 30000); // Every 30 seconds

  return () => {
    clearInterval(intervalId); // Clean up on unmount or deps change
  };
}, [autoDJMode, isPlaying]);
```

```typescript
// Event listener with cleanup
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !isInputFocused()) {
      e.preventDefault();
      togglePlayback();
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Common Patterns in DJ.ai

**localStorage sync:**
```typescript
// Persist settings whenever they change
useEffect(() => {
  localStorage.setItem('dj-ai-settings', JSON.stringify(settings));
}, [settings]);
```

**Ref synchronization (stale closure prevention):**
```typescript
// Keep refs in sync with state for use in closures
useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
useEffect(() => { playlistRef.current = playlist; }, [playlist]);
useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
useEffect(() => { settingsRef.current = settings; }, [settings]);
```

**One-time initialization:**
```typescript
// Bootstrap the app — runs once on mount
useEffect(() => {
  async function init() {
    const container = await bootstrap();
    const provider = getMusicProvider();
    setCurrentProvider(provider);
  }
  init();
}, []);
```

**Token refresh timer:**
```typescript
useEffect(() => {
  const tokenExpiry = localStorage.getItem('oauth_token_expiry');
  if (!tokenExpiry) return;

  const msUntilRefresh = Number(tokenExpiry) - Date.now() - 300000; // 5min early
  if (msUntilRefresh <= 0) {
    refreshToken();
    return;
  }

  const timerId = setTimeout(refreshToken, msUntilRefresh);
  return () => clearTimeout(timerId);
}, [tokenExpiry]);
```

### Common Mistakes

**Missing dependency (stale value):**
```typescript
// BUG: count is always 0 in the interval callback
useEffect(() => {
  const id = setInterval(() => setCount(count + 1), 1000); // `count` is stale!
  return () => clearInterval(id);
}, []); // Missing `count` in deps

// FIX: use functional updater
useEffect(() => {
  const id = setInterval(() => setCount(prev => prev + 1), 1000);
  return () => clearInterval(id);
}, []);
```

**Infinite loop:**
```typescript
// BUG: object created on every render triggers useEffect infinitely
useEffect(() => {
  fetchData(options); // `options` is a new object every render
}, [options]); // Referential inequality → infinite loop

// FIX: memoize or destructure the dependency
const { limit, query } = options;
useEffect(() => {
  fetchData({ limit, query });
}, [limit, query]); // Primitives are compared by value
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — 10+ useEffect calls: app bootstrap, ref synchronization (6+ refs synced), localStorage persistence, keyboard shortcuts, Electron tray callbacks, auto-DJ lookahead timers
- **`electron-app/src/components/OAuthCallback.tsx`** — `useEffect` with `[]` deps for one-time OAuth code exchange on mount
- **`electron-app/src/components/OnboardingWizard.tsx`** — `useEffect` with polling interval (1.5s) to check provider auth status, with cleanup
- **`electron-app/src/components/Toast.tsx`** — `useEffect` for auto-dismiss timers with cleanup via `clearTimeout`

---

## 🎯 Key Takeaways

- **`useEffect`** synchronizes React with external systems (APIs, timers, DOM, IPC)
- **Dependency array** controls when the effect re-runs — always include all referenced values
- **Cleanup function** prevents memory leaks — clear timers, remove listeners, abort fetches
- DJ.ai uses the **ref sync pattern** extensively to avoid stale closures in one-time effects
- **Functional updaters** (`setCount(prev => prev + 1)`) avoid stale state in intervals/callbacks
- The ESLint `exhaustive-deps` rule catches missing dependencies — don't suppress it without good reason

---

## 📖 Resources

- [useEffect](https://react.dev/reference/react/useEffect) — Official API reference
- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects) — Conceptual guide
- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) — When to avoid useEffect
- [Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects) — Effect lifecycle deep dive
