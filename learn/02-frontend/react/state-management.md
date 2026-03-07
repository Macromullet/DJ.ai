# State Management

> No Redux, no Zustand — DJ.ai manages state with lifted state in App.tsx and localStorage persistence.

State management is how a React app tracks and shares data across components. While many apps reach for libraries like Redux, Zustand, or Jotai, DJ.ai takes a simpler approach: **all shared state lives in `App.tsx`** and flows down via props. Persistent state (settings, tokens, volume) is synced to **localStorage** via `useEffect`. This works well because DJ.ai has a single page with one component tree — there's no need for a global store.

---

## Core Concepts

### DJ.ai's State Architecture

```
App.tsx (state owner)
├── currentTrack        → TrackProgressBar, VolumeControl
├── playlist            → playlist display
├── isPlaying           → play/pause button, playback controls
├── searchQuery/Results → search bar, results list
├── settings            → Settings panel
├── showSettings        → Settings visibility toggle
├── showOnboarding      → OnboardingWizard visibility
├── djCommentary        → commentary display
├── volume / isMuted    → VolumeControl
└── ... (15+ state variables)
```

All state originates in App.tsx and flows **down** to child components as props. Children communicate **up** by calling callback functions passed as props.

### Lifting State Up

When two components need the same data, the state should live in their **closest common ancestor**. In DJ.ai, that ancestor is always `App.tsx`:

```typescript
// App.tsx owns the volume state
const [volume, setVolume] = useState(80);

// Passed down to VolumeControl
<VolumeControl
  volume={volume}
  onVolumeChange={setVolume}
/>

// Also used for audio playback
useEffect(() => {
  if (audioElement) {
    audioElement.volume = volume / 100;
  }
}, [volume]);
```

### localStorage Persistence

DJ.ai persists important state to localStorage so it survives app restarts:

```typescript
// Load from localStorage on mount (lazy initial state)
const [settings, setSettings] = useState<SettingsConfig>(() => {
  const saved = localStorage.getItem('dj-ai-settings');
  return saved ? JSON.parse(saved) : defaultSettings;
});

// Sync to localStorage whenever settings change
useEffect(() => {
  localStorage.setItem('dj-ai-settings', JSON.stringify(settings));
}, [settings]);
```

What DJ.ai persists:
- **Settings** — provider, TTS config, AI provider, auto-DJ mode
- **OAuth tokens** — access tokens, refresh tokens, expiry timestamps
- **Device token** — unique app instance identifier
- **Volume** — last-used volume level
- **Onboarding status** — whether the user completed setup

### React Context for Cross-Cutting Concerns

While most state flows through props, DJ.ai uses **React Context** for the toast notification system, which needs to be accessible from anywhere in the tree:

```typescript
// Toast context — available to all components
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }].slice(-5));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration ?? (type === 'error' ? 6000 : 4000));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}
```

### Why Not Redux/Zustand?

DJ.ai deliberately avoids external state management libraries:

| Concern | DJ.ai's Solution | Why Not Redux? |
|---------|-----------------|----------------|
| Shared state | Lifted to App.tsx | One component tree, one page |
| Persistence | localStorage + useEffect | Redux persistence adds complexity |
| Cross-cutting | React Context (toasts) | Context is sufficient for 1-2 concerns |
| Async state | useState + try/catch | No need for middleware (thunks, sagas) |
| DevTools | React DevTools | Redux DevTools adds another dependency |

This approach works because:
1. DJ.ai is a **single-page desktop app** — no route-based code splitting
2. The component tree is **relatively shallow** — prop drilling is manageable
3. **Performance** isn't a concern — state updates are localized and infrequent
4. **Simplicity** — fewer dependencies, fewer concepts to learn, fewer bugs

### When to Consider a State Library

If DJ.ai grows to include these features, a state library might become worthwhile:
- Multiple independent pages/routes with shared state
- Complex state machines (e.g., multi-step playback workflows)
- Real-time collaborative features (multi-user DJ sessions)
- Server state caching (React Query would be appropriate)

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Central state owner with 15+ useState calls; all state flows down as props
- **`electron-app/src/components/Toast.tsx`** — React Context provider for global toast notifications
- **`electron-app/src/components/Settings.tsx`** — Receives `settings` and `onSettingsChange` props from App.tsx
- **`electron-app/src/components/VolumeControl.tsx`** — Receives `volume` and `onVolumeChange` props; persists to localStorage internally
- **`electron-app/src/config/bootstrap.ts`** — Reads initial state from localStorage during app initialization

---

## 🎯 Key Takeaways

- DJ.ai uses **lifted state in App.tsx** — no Redux, Zustand, or external state library
- **localStorage** provides persistence for settings, tokens, and preferences
- **React Context** is used sparingly — only for toast notifications (truly cross-cutting)
- **Props** are the primary communication mechanism between components
- This approach works because DJ.ai is a **single-page, single-tree** desktop app
- The simplicity of this approach reduces bundle size, learning curve, and potential bugs

---

## 📖 Resources

- [Managing State](https://react.dev/learn/managing-state) — Official guide to React state management
- [Sharing State Between Components](https://react.dev/learn/sharing-state-between-components) — Lifting state up
- [Passing Data Deeply with Context](https://react.dev/learn/passing-data-deeply-with-context) — When to use Context
- [You Might Not Need Redux](https://medium.com/@dan_abramov/you-might-not-need-redux-be46360cf367) — Dan Abramov on state management
