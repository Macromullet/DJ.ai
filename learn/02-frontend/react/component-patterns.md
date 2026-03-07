# Component Patterns

> Functional components, composition, children, and props — how DJ.ai builds its UI.

React components are the building blocks of DJ.ai's interface. Every piece of UI — from the search bar to the audio visualizer — is a functional component that receives data via **props** and renders JSX. DJ.ai follows a strict component hierarchy: `App.tsx` owns all state and passes it down to child components via props, with each component focused on a single responsibility.

---

## Core Concepts

### Functional Components

All DJ.ai components are functions that return JSX:

```typescript
// Simple component with typed props
interface TrackCardProps {
  track: SearchResult;
  isPlaying: boolean;
  onPlay: (track: SearchResult) => void;
}

function TrackCard({ track, isPlaying, onPlay }: TrackCardProps) {
  return (
    <div className="track-card" role="button" tabIndex={0}
         onClick={() => onPlay(track)}
         onKeyDown={(e) => { if (e.key === 'Enter') onPlay(track); }}>
      {track.thumbnailUrl && (
        <img src={track.thumbnailUrl} alt={`${track.title} album art`} />
      )}
      <div className="track-info">
        <span className="track-title">{track.title}</span>
        <span className="track-artist">{track.artist}</span>
      </div>
      {isPlaying && <span className="now-playing" aria-label="Now playing">▶</span>}
    </div>
  );
}
```

### Composition via Children

React's `children` prop enables component composition — wrapping content without the parent knowing what's inside:

```typescript
// ErrorBoundary wraps the entire app
<ErrorBoundary>
  <BrowserRouter>
    <Routes>
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  </BrowserRouter>
</ErrorBoundary>
```

```typescript
// Toast provider wraps the app to provide showToast to all children
<ToastProvider>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</ToastProvider>
```

### Props as the Data Contract

Props flow **down** from parent to child. DJ.ai's App.tsx passes state and callbacks to every child:

```typescript
// App.tsx passes data and handlers to child components
<Settings
  settings={settings}
  onSettingsChange={handleSettingsChange}
  providers={providerMap}
  currentProvider={currentProvider}
  onProviderChange={handleProviderChange}
/>

<VolumeControl
  volume={volume}
  onVolumeChange={setVolume}
  isMuted={isMuted}
  onMuteToggle={() => setIsMuted(prev => !prev)}
/>

<TrackProgressBar
  currentTrack={currentTrack}
  isPlaying={isPlaying}
  provider={currentProvider}
  onSeek={handleSeek}
/>
```

### Conditional Rendering

DJ.ai uses several conditional rendering patterns:

```typescript
// Logical AND — render only if condition is true
{showSettings && <Settings ... />}

// Ternary — render one of two elements
{isPlaying ? <PauseIcon /> : <PlayIcon />}

// Early return — guard clause in component
function AudioVisualizer({ isPlaying }: Props) {
  if (!isPlaying) return null; // Don't render when not playing
  return <canvas ref={canvasRef} />;
}

// Nullish coalescing — fallback for missing data
<span>{currentTrack?.artist ?? 'Unknown Artist'}</span>
```

### Component Organization

DJ.ai organizes components by feature area:

```
components/
├── Settings.tsx            # Settings panel (standalone)
├── Toast.tsx               # Toast notifications + useToast hook
├── VolumeControl.tsx       # Volume slider + mute
├── TrackProgressBar.tsx    # Playback progress + seek
├── AudioVisualizer.tsx     # Three.js WebGL visualizer
├── ErrorBoundary.tsx       # Error catching wrapper
├── OAuthCallback.tsx       # OAuth redirect handler
├── OnboardingWizard.tsx    # Multi-step setup wizard
├── TestModeIndicator.tsx   # Test mode badge
└── onboarding/             # Onboarding sub-components
    ├── WelcomeStep.tsx
    ├── MusicProviderStep.tsx
    ├── AISetupStep.tsx
    └── CompletionStep.tsx
```

Each component has a **single responsibility** and communicates with its parent only through props.

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Root component that composes all child components; owns all state and passes it down via props
- **`electron-app/src/components/Settings.tsx`** — Receives `settings`, `onSettingsChange`, `providers` as props
- **`electron-app/src/components/Toast.tsx`** — Uses the **provider pattern** (React Context) to make `showToast` available anywhere in the tree
- **`electron-app/src/components/OnboardingWizard.tsx`** — Composes step sub-components (`WelcomeStep`, `MusicProviderStep`, `AISetupStep`, `CompletionStep`)
- **`electron-app/src/components/ErrorBoundary.tsx`** — Uses `children` prop to wrap the entire app
- **`electron-app/src/components/AudioVisualizer.tsx`** — Receives playback state and audio source as props; manages Three.js internally

---

## 🎯 Key Takeaways

- DJ.ai uses **functional components exclusively** (except ErrorBoundary which requires a class)
- **Props flow down** — App.tsx owns state, children receive it as props
- **Composition via children** — ErrorBoundary, ToastProvider, and BrowserRouter wrap the app tree
- **Conditional rendering** with `&&`, ternaries, and early returns keeps JSX clean
- **Single responsibility** — each component handles one concern (playback, settings, toast, etc.)
- **TypeScript interfaces** for props enforce the data contract between parent and child

---

## 📖 Resources

- [Thinking in React](https://react.dev/learn/thinking-in-react) — Component design philosophy
- [Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component) — Props deep dive
- [Composition vs Inheritance](https://react.dev/learn/thinking-in-react#step-4-identify-where-your-state-should-live) — React's composition model
- [Conditional Rendering](https://react.dev/learn/conditional-rendering) — Patterns for conditional UI
