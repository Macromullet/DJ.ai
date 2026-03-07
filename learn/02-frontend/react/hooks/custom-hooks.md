# Custom Hooks

> Extracting reusable stateful logic — how DJ.ai composes hooks into higher-level abstractions.

Custom hooks are JavaScript functions whose names start with `use` that call other hooks. They let you extract component logic into reusable functions without changing your component hierarchy. DJ.ai uses custom hooks for toast notifications (`useToast`), and the pattern is ideal for extracting common patterns like provider state management, audio playback control, and settings persistence.

---

## Core Concepts

### What Is a Custom Hook?

A custom hook is a function that:
1. Starts with `use` (e.g., `useToast`, `useProvider`, `useLocalStorage`)
2. Can call other hooks (`useState`, `useEffect`, `useRef`, etc.)
3. Returns values and/or functions for the consuming component

```typescript
// Custom hook — encapsulates localStorage + state sync
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [stored, setStored] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  const setValue = (value: T) => {
    setStored(value);
    localStorage.setItem(key, JSON.stringify(value));
  };

  return [stored, setValue];
}

// Usage in a component
function Settings() {
  const [volume, setVolume] = useLocalStorage('dj-ai-volume', 80);
  // `volume` is persisted across sessions
}
```

### DJ.ai's useToast Hook

The `Toast.tsx` component exports a `useToast` custom hook that provides toast notification capabilities to any component:

```typescript
// From electron-app/src/components/Toast.tsx
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Usage in App.tsx
function App() {
  const { showToast } = useToast();

  const handleError = (error: Error) => {
    showToast(error.message, 'error', 6000);
  };

  const handleSuccess = () => {
    showToast('Track added to playlist', 'success');
  };
}
```

### Building Custom Hooks

**Pattern 1: Encapsulating complex state logic**

```typescript
// Hook for managing audio playback state
function usePlayback(provider: IMusicProvider | null) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const play = useCallback(async (track: SearchResult) => {
    if (!provider) return;
    try {
      await provider.playTrack(track);
      setCurrentTrack(provider.toTrack(track));
      setIsPlaying(true);
    } catch (error) {
      console.error('Playback failed:', error);
    }
  }, [provider]);

  const toggle = useCallback(async () => {
    if (!provider) return;
    if (isPlayingRef.current) {
      await provider.pause();
    } else {
      await provider.play();
    }
    setIsPlaying(prev => !prev);
  }, [provider]);

  return { isPlaying, currentTrack, play, toggle };
}
```

**Pattern 2: Wrapping browser APIs**

```typescript
// Hook for keyboard shortcuts
function useKeyboardShortcut(key: string, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler; // Always fresh

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === key && !isInputElement(e.target)) {
        e.preventDefault();
        handlerRef.current();
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [key]); // Only re-register if key changes
}

// Usage
useKeyboardShortcut(' ', togglePlayback);
useKeyboardShortcut('ArrowRight', handleNextTrack);
```

**Pattern 3: Composing hooks together**

```typescript
// Combines multiple hooks for a complete feature
function useAutoDJ(provider: IMusicProvider | null, currentTrack: Track | null) {
  const [isEnabled, setIsEnabled] = useLocalStorage('auto-dj', false);
  const preGenCache = useRef(new Map());
  const { showToast } = useToast();

  useEffect(() => {
    if (!isEnabled || !currentTrack || !provider) return;

    const timer = setTimeout(async () => {
      try {
        const recs = await provider.getRecommendations(currentTrack, 3);
        // Pre-cache recommendations...
      } catch (error) {
        showToast('Auto-DJ failed to fetch recommendations', 'warning');
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [isEnabled, currentTrack, provider, showToast]);

  return { isEnabled, setIsEnabled, preGenCache };
}
```

### Rules for Custom Hooks

1. **Name starts with `use`** — React lint rules enforce hook rules only in `use*` functions
2. **Can call other hooks** — `useState`, `useEffect`, `useRef`, custom hooks
3. **Each call is independent** — two components using the same hook get separate state
4. **Don't call conditionally** — same rules as built-in hooks

---

## 🔗 DJ.ai Connection

- **`electron-app/src/components/Toast.tsx`** — Exports `useToast()` custom hook via React Context; used in `App.tsx` and other components for toast notifications
- **`electron-app/src/App.tsx`** — Uses `useToast()` throughout; the App's state management could be further decomposed into custom hooks like `usePlayback`, `useAutoDJ`, `useProviderState`
- **`electron-app/src/components/OnboardingWizard.tsx`** — Internal state management could be extracted into a `useOnboarding` hook
- **`electron-app/src/config/bootstrap.ts`** — Initialization logic that could be wrapped in a `useBootstrap` hook

---

## 🎯 Key Takeaways

- Custom hooks **extract reusable stateful logic** from components
- They follow the same **rules as built-in hooks** (top-level, `use` prefix)
- Each component using a custom hook gets **its own independent state**
- DJ.ai's `useToast` is a production example — it wraps Context for global toast notifications
- The **ref-sync pattern** used throughout App.tsx is an ideal candidate for a custom hook
- Custom hooks can **compose** other custom hooks — building higher-level abstractions

---

## 📖 Resources

- [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks) — Official guide
- [Building Your Own Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks#extracting-your-own-custom-hook-from-a-component) — Step-by-step extraction
- [useHooks](https://usehooks.com/) — Community collection of useful custom hooks
