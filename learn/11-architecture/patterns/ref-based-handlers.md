# Ref-Based Handlers

## The Concept

In React, **closures capture the state values from the render in which they were created**. This creates a problem: event listeners registered once (like keyboard shortcuts or system tray callbacks) close over stale state values. They see the state as it was when they were registered, not the current state.

```typescript
// ❌ Bug: stale closure
const [isPlaying, setIsPlaying] = useState(false);

useEffect(() => {
  const handler = () => {
    console.log(isPlaying); // Always false — captured from first render
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []); // Empty deps = registered once, never updated
```

### The Ref Solution

`useRef` creates a mutable container that persists across renders. By writing the current state into a ref and reading from the ref in callbacks, you always get the latest value:

```typescript
// ✅ Fixed: ref always has current value
const [isPlaying, setIsPlaying] = useState(false);
const isPlayingRef = useRef(isPlaying);

// Keep ref in sync with state
useEffect(() => {
  isPlayingRef.current = isPlaying;
}, [isPlaying]);

// Callback reads from ref, not closure
useEffect(() => {
  const handler = () => {
    console.log(isPlayingRef.current); // Always current value
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

## How DJ.ai Uses Ref-Based Handlers

DJ.ai has several event listeners that are registered once but need access to constantly-changing state:

### Keyboard/Media Key Handlers

```typescript
// electron-app/src/components/ (simplified)
const isPlayingRef = useRef(false);
const currentTrackRef = useRef<Track | null>(null);
const playlistRef = useRef<Track[]>([]);

// Sync state → refs
useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
useEffect(() => { playlistRef.current = playlist; }, [playlist]);

// Tray/media key handler — registered once, reads refs
useEffect(() => {
  window.electron.on('media-key-pressed', (key: string) => {
    if (key === 'play-pause') {
      if (isPlayingRef.current) pause();
      else play();
    }
    if (key === 'next') {
      const idx = playlistRef.current.indexOf(currentTrackRef.current);
      playTrack(playlistRef.current[idx + 1]);
    }
  });
}, []);
```

### Why Not Re-Register on Every State Change?

You *could* add `isPlaying` to the `useEffect` dependency array — but that would unregister and re-register the event listener on every state change. For system-level handlers (tray, media keys, IPC), this creates flickering, missed events, and wasted re-renders.

### The Pattern

```
State changes → useEffect syncs ref → Callback reads ref
              (cheap, no re-registration)
```

## DJ.ai Connection

The ref-based handler pattern appears throughout DJ.ai's `MusicPlayer` and `App` components. `isPlayingRef`, `playlistRef`, and `currentTrackRef` are maintained alongside their state counterparts. System tray callbacks, media key handlers, and keyboard shortcuts all read from refs to avoid stale closures. This is a critical React pattern for any app with external event sources.

## Key Takeaways

- Closures capture state from the render they were created in — they go stale
- `useRef` provides a mutable container that always holds the latest value
- Sync state to refs in a `useEffect` — read refs in long-lived callbacks
- This pattern is essential for system events (keyboard, tray, IPC) that register once

## Further Reading

- [React Docs: useRef](https://react.dev/reference/react/useRef)
- [Dan Abramov: useRef and the Stale Closure Problem](https://overreacted.io/making-setinterval-declarative-with-react-hooks/)
- [React Docs: Referencing Values with Refs](https://react.dev/learn/referencing-values-with-refs)
