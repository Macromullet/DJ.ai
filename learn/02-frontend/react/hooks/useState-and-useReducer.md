# useState and useReducer

> Managing component state — the most fundamental React hook used throughout DJ.ai.

`useState` is the simplest way to add state to a functional component. For more complex state logic, `useReducer` provides a Redux-like pattern with actions and a reducer function. DJ.ai primarily uses `useState` for its simplicity — App.tsx alone has 15+ state variables managing everything from the current track to search results to UI visibility.

---

## Core Concepts

### useState

`useState` returns a state value and a setter function. The component re-renders whenever the state changes:

```typescript
// Basic usage
const [isPlaying, setIsPlaying] = useState(false);
const [searchQuery, setSearchQuery] = useState('');
const [playlist, setPlaylist] = useState<Track[]>([]);
const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
```

### Typing useState

TypeScript infers the type from the initial value, but you can provide explicit types for complex or nullable state:

```typescript
// Inferred as boolean
const [isPlaying, setIsPlaying] = useState(false);

// Explicit type needed — initial value is null but will hold a Track
const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

// Explicit type for complex objects
const [settings, setSettings] = useState<SettingsConfig>({
  currentProvider: 'spotify',
  ttsEnabled: true,
  ttsProvider: 'web-speech',
  autoDJMode: false,
  // ...
});
```

### Updating State

State updates are **asynchronous** and batched. Use the **functional updater** form when the new state depends on the previous state:

```typescript
// Direct update — fine when not based on previous state
setSearchQuery('Queen');

// Functional updater — required when based on previous state
setPlaylist(prev => [...prev, newTrack]);

// WRONG: stale state in rapid updates
setPlaylist([...playlist, newTrack]); // `playlist` may be stale!

// RIGHT: functional updater always gets latest state
setPlaylist(prev => [...prev, newTrack]);
```

DJ.ai uses the functional form extensively for playlist manipulation:

```typescript
// Adding a track to the playlist
setPlaylist(prev => [...prev, provider.toTrack(result)]);

// Removing a track by index
setPlaylist(prev => prev.filter((_, i) => i !== indexToRemove));

// Clearing the playlist
setPlaylist([]);
```

### Lazy Initial State

For expensive initial values, pass a function to `useState` — it runs only on the first render:

```typescript
// Lazy initialization — reads from localStorage once
const [settings, setSettings] = useState<SettingsConfig>(() => {
  const saved = localStorage.getItem('dj-ai-settings');
  return saved ? JSON.parse(saved) : defaultSettings;
});
```

### useReducer

`useReducer` is an alternative to `useState` for state with complex transitions. It takes a reducer function and an initial state:

```typescript
type ToastAction =
  | { type: 'ADD'; toast: ToastItem }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: ToastItem[], action: ToastAction): ToastItem[] {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast].slice(-5); // Max 5 toasts
    case 'REMOVE':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

// In a component
const [toasts, dispatch] = useReducer(toastReducer, []);
dispatch({ type: 'ADD', toast: { id: 'abc', message: 'Track added', type: 'success' } });
```

`useReducer` is preferred when:
- State has multiple sub-values
- Next state depends on previous state in complex ways
- You want to pass dispatch down instead of multiple setters

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — 15+ useState calls: `currentTrack`, `playlist`, `isPlaying`, `searchQuery`, `searchResults`, `djCommentary`, `showSettings`, `isFullscreen`, `showOnboarding`, `volume`, and more
- **`electron-app/src/components/Settings.tsx`** — useState for form fields, provider connection status, API key inputs
- **`electron-app/src/components/Toast.tsx`** — Toast queue management (could use useReducer pattern)
- **`electron-app/src/components/VolumeControl.tsx`** — `useState` for volume level and mute state with localStorage persistence
- **`electron-app/src/components/TrackProgressBar.tsx`** — `useState` for current position and seeking state
- **`electron-app/src/components/OnboardingWizard.tsx`** — `useState` for current step, connected providers Set, and saved API keys Set

---

## 🎯 Key Takeaways

- **`useState`** is DJ.ai's primary state mechanism — simple and effective for most cases
- Always use the **functional updater** (`prev => ...`) when new state depends on previous state
- **Type your state** explicitly for nullable values: `useState<Track | null>(null)`
- **Lazy initialization** (`useState(() => ...)`) avoids expensive computation on every render
- Use **`useReducer`** when state transitions are complex or have multiple sub-values
- State updates trigger re-renders — this is how React keeps the UI in sync with data

---

## 📖 Resources

- [useState](https://react.dev/reference/react/useState) — Official API reference
- [useReducer](https://react.dev/reference/react/useReducer) — Official API reference
- [State: A Component's Memory](https://react.dev/learn/state-a-components-memory) — Conceptual guide
- [Updating Objects in State](https://react.dev/learn/updating-objects-in-state) — Immutability patterns
- [Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state) — Array manipulation patterns
