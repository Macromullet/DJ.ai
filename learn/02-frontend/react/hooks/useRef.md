# useRef

> Mutable references that persist across renders — DJ.ai's secret weapon against stale closures.

`useRef` creates a mutable object (`{ current: value }`) that persists for the entire lifetime of the component without causing re-renders when changed. DJ.ai uses `useRef` more heavily than most React apps — with **9+ refs in App.tsx alone** — because Electron IPC callbacks and tray handlers are registered once and need access to the latest state values.

---

## Core Concepts

### Basic useRef

```typescript
const countRef = useRef(0);

// Reading
console.log(countRef.current); // 0

// Writing — does NOT trigger a re-render
countRef.current = 42;
```

Unlike `useState`, changing `ref.current` never causes the component to re-render. This makes refs perfect for:
- Values that change frequently but don't affect the UI
- Values needed by callbacks that were registered once
- DOM element references

### useState vs useRef

| Feature | `useState` | `useRef` |
|---------|------------|----------|
| Triggers re-render | ✅ Yes | ❌ No |
| Persists across renders | ✅ Yes | ✅ Yes |
| Accessible in closures | ⚠️ May be stale | ✅ Always current |
| Use for | UI-driving state | Internal values, DOM refs |

### DJ.ai's Ref-Sync Pattern

This is the **most important pattern** in DJ.ai's React code. The problem: Electron tray callbacks and keyboard handlers are registered once (in `useEffect` with `[]` deps). If they read `useState` values, they get the initial values forever (stale closures). The solution: mirror state into refs.

```typescript
// STATE — drives React UI re-renders
const [isPlaying, setIsPlaying] = useState(false);
const [playlist, setPlaylist] = useState<Track[]>([]);
const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
const [settings, setSettings] = useState<SettingsConfig>(defaultSettings);

// REFS — mirror state for use in one-time registered callbacks
const isPlayingRef = useRef(false);
const playlistRef = useRef<Track[]>([]);
const currentTrackRef = useRef<Track | null>(null);
const settingsRef = useRef<SettingsConfig>(defaultSettings);

// SYNC — keep refs current via useEffect
useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
useEffect(() => { playlistRef.current = playlist; }, [playlist]);
useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
useEffect(() => { settingsRef.current = settings; }, [settings]);

// ONE-TIME REGISTRATION — callback reads ref, not state
useEffect(() => {
  window.electron.tray.onPlaybackToggle(() => {
    // isPlayingRef.current is always fresh
    if (isPlayingRef.current) {
      currentProvider?.pause();
    } else {
      currentProvider?.play();
    }
    setIsPlaying(prev => !prev);
  });
}, []); // Empty deps — registered once, but ref is always current
```

### DOM Refs

`useRef` can also hold DOM element references for imperative operations:

```typescript
function SearchBar() {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusSearch = () => {
    inputRef.current?.focus(); // Imperative DOM access
  };

  return <input ref={inputRef} placeholder="Search tracks..." />;
}
```

### Non-State Refs in DJ.ai

Beyond the state-sync pattern, DJ.ai uses refs for internal values that don't affect rendering:

```typescript
// Play request counter — prevents race conditions in rapid track changes
const playRequestIdRef = useRef(0);

async function handlePlayTrack(track: SearchResult) {
  const requestId = ++playRequestIdRef.current;
  const url = await provider.playTrack(track);
  // If another play was requested while waiting, abort this one
  if (playRequestIdRef.current !== requestId) return;
  // Continue with playback...
}

// Pre-generated commentary/audio cache
const preGenCacheRef = useRef<Map<string, { commentary: string; audioBlob?: Blob }>>(
  new Map()
);

// Transition state flag
const isTransitioningRef = useRef(false);
```

### When to Use useRef vs useState

Use **useState** when:
- The value should appear in the UI
- Changing it should trigger a re-render
- It's part of the component's visual output

Use **useRef** when:
- The value is needed in callbacks registered once (IPC, tray, keyboard)
- The value changes frequently but doesn't affect UI (animation counters, request IDs)
- You need a DOM reference for imperative operations
- You need a mutable cache that shouldn't trigger re-renders

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — 9+ refs: `isPlayingRef`, `playlistRef`, `currentTrackRef`, `settingsRef`, `autoDJModeRef`, `ttsEnabledRef`, `isTransitioningRef`, `playRequestIdRef`, `preGenCacheRef`; all synced via `useEffect`
- **`electron-app/src/components/AudioVisualizer.tsx`** — `useRef` for the Three.js `WebGLRenderer`, `Scene`, `Camera`, `AnalyserNode`, and canvas DOM element
- **`electron-app/src/components/TrackProgressBar.tsx`** — `useRef` for the progress bar DOM element and dragging state
- **`electron-app/src/components/VolumeControl.tsx`** — `useRef` for the slider DOM element

---

## 🎯 Key Takeaways

- **`useRef`** creates a persistent mutable container that never triggers re-renders
- DJ.ai's **ref-sync pattern** (`useState` + `useRef` + `useEffect`) solves stale closures in Electron callbacks
- This pattern appears **9+ times** in App.tsx — it's the most critical React pattern in the codebase
- Use refs for **internal state** (request IDs, caches, transition flags) that doesn't affect UI
- Use refs for **DOM access** when you need imperative operations (focus, scroll, measure)
- **Never read `ref.current` during render** for values that should affect UI — use `useState` instead

---

## 📖 Resources

- [useRef](https://react.dev/reference/react/useRef) — Official API reference
- [Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs) — When to use refs
- [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs) — DOM ref patterns
