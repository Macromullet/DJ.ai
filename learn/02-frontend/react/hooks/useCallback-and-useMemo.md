# useCallback and useMemo

> Memoization hooks for performance — preventing unnecessary recalculations and re-renders.

`useCallback` memoizes a function reference, and `useMemo` memoizes a computed value. Both return the cached result when their dependencies haven't changed. DJ.ai uses these hooks to stabilize function references passed as props and to avoid expensive recalculations during rapid state updates (like during playback or search).

---

## Core Concepts

### useCallback

`useCallback` returns a memoized version of a callback function. The function is only recreated when its dependencies change:

```typescript
// Without useCallback — new function on every render
const handleSearch = (query: string) => {
  provider.searchTracks(query).then(setSearchResults);
};

// With useCallback — same function reference unless `provider` changes
const handleSearch = useCallback((query: string) => {
  provider.searchTracks(query).then(setSearchResults);
}, [provider]);
```

**Why it matters:** In React, a new function object is created on every render. If this function is passed as a prop to a child component, the child re-renders every time — even if nothing meaningful changed. `useCallback` stabilizes the reference.

### useMemo

`useMemo` memoizes a computed value. The computation only re-runs when dependencies change:

```typescript
// Without useMemo — recalculates on every render
const sortedPlaylist = playlist.sort((a, b) => a.name.localeCompare(b.name));

// With useMemo — only recalculates when `playlist` changes
const sortedPlaylist = useMemo(
  () => [...playlist].sort((a, b) => a.name.localeCompare(b.name)),
  [playlist]
);
```

### When to Use Each

| Hook | Memoizes | Use When |
|------|----------|----------|
| `useCallback` | Function reference | Passing callbacks to child components or effects |
| `useMemo` | Computed value | Expensive calculations, derived data, stable objects |

### Practical Examples from DJ.ai Patterns

**Memoized event handlers:**
```typescript
// Stable reference for playback toggle — passed to VolumeControl and tray
const togglePlayback = useCallback(async () => {
  if (!currentProvider) return;
  try {
    if (isPlayingRef.current) {
      await currentProvider.pause();
    } else {
      await currentProvider.play();
    }
    setIsPlaying(prev => !prev);
  } catch (error) {
    showToast('Playback toggle failed', 'error');
  }
}, [currentProvider, showToast]);
```

Note the use of `isPlayingRef.current` instead of `isPlaying` — the ref avoids adding `isPlaying` to the dependency array, which would recreate the callback on every play/pause toggle.

**Memoized derived data:**
```typescript
// Only recalculate when playlist changes
const playlistDuration = useMemo(() => {
  return playlist.reduce((total, track) => total + (track.durationMs || 0), 0);
}, [playlist]);

// Only recompute when search results change
const uniqueArtists = useMemo(() => {
  return [...new Set(searchResults.map(r => r.artist))];
}, [searchResults]);
```

**Memoized objects (preventing unnecessary child re-renders):**
```typescript
// Without useMemo — new object every render → child always re-renders
<PlayerControls config={{ isPlaying, volume, track: currentTrack }} />

// With useMemo — stable object when values haven't changed
const playerConfig = useMemo(
  () => ({ isPlaying, volume, track: currentTrack }),
  [isPlaying, volume, currentTrack]
);
<PlayerControls config={playerConfig} />
```

### When NOT to Use Memoization

Memoization has overhead — comparing dependencies costs time and memory. Don't use it for:

```typescript
// ❌ Simple value — the comparison costs more than recalculation
const fullName = useMemo(() => `${artist} - ${title}`, [artist, title]);
// ✅ Just compute inline
const fullName = `${artist} - ${title}`;

// ❌ Callback that's never passed as a prop or used in useEffect deps
const handleClick = useCallback(() => {
  console.log('clicked');
}, []);
// ✅ Just use a regular function
const handleClick = () => console.log('clicked');
```

**Rule of thumb:** Profile first. Add memoization when you observe performance issues, not preemptively — unless you're passing callbacks to `React.memo`-wrapped children or using them in `useEffect` dependency arrays.

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — `useCallback` for `handleSearch`, `handlePlayTrack`, `handleNextTrack`, `handlePreviousTrack`, `togglePlayback`, and other handlers passed to child components and registered with Electron IPC
- **`electron-app/src/components/Toast.tsx`** — `useCallback` for the `showToast` function returned by `useToast` hook to prevent consumer re-renders
- **`electron-app/src/components/Settings.tsx`** — `useCallback` for onChange handlers passed to form inputs
- **`electron-app/src/components/AudioVisualizer.tsx`** — `useMemo` for Three.js geometries and materials that shouldn't be recreated on every render

---

## 🎯 Key Takeaways

- **`useCallback`** memoizes functions; **`useMemo`** memoizes values
- Both only recompute when their **dependency array** changes
- Use `useCallback` when passing handlers to child components or `useEffect` dependencies
- Use `useMemo` for **expensive calculations** or objects/arrays that cause unwanted child re-renders
- **Don't over-memoize** — premature optimization adds complexity; profile first
- DJ.ai combines `useCallback` with `useRef` reads to minimize dependency arrays

---

## 📖 Resources

- [useCallback](https://react.dev/reference/react/useCallback) — Official API reference
- [useMemo](https://react.dev/reference/react/useMemo) — Official API reference
- [When to useMemo and useCallback](https://kentcdodds.com/blog/usememo-and-usecallback) — Kent C. Dodds on when memoization helps
