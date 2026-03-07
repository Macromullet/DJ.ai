# React

> React 19 powers DJ.ai's entire user interface — functional components and hooks all the way down.

React is a JavaScript library for building user interfaces through composable components. DJ.ai uses **React 19** with exclusively **functional components** and **hooks** — the only class component is `ErrorBoundary` (required by React's error boundary API). The entire UI — search, playback controls, settings, onboarding wizard, audio visualizer, and toast notifications — is built as a tree of React components rooted in `App.tsx`.

---

## Why React 19

1. **Component model** — break complex UI into small, reusable, testable pieces
2. **Declarative rendering** — describe what the UI should look like; React handles DOM updates
3. **Hooks** — manage state, side effects, refs, and memoization without classes
4. **Ecosystem** — React Router, Vite, testing libraries all integrate seamlessly
5. **React 19** — latest stable with improved performance and concurrent features

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Hooks](./hooks/README.md) | useState, useEffect, useRef, useCallback, custom hooks |
| 2 | [Component Patterns](./component-patterns.md) | Composition, children, props |
| 3 | [State Management](./state-management.md) | Lifted state, localStorage, no Redux |
| 4 | [Error Boundaries](./error-boundaries.md) | Catching rendering errors |

---

## 🔗 DJ.ai Connection

| Component | File | Purpose |
|-----------|------|---------|
| `App` | `electron-app/src/App.tsx` | Root component — all state, routing, providers |
| `Settings` | `electron-app/src/components/Settings.tsx` | Provider config, API keys, TTS settings |
| `Toast` | `electron-app/src/components/Toast.tsx` | Notification system with `useToast` hook |
| `OnboardingWizard` | `electron-app/src/components/OnboardingWizard.tsx` | Multi-step setup flow |
| `AudioVisualizer` | `electron-app/src/components/AudioVisualizer.tsx` | Three.js WebGL visualization |
| `VolumeControl` | `electron-app/src/components/VolumeControl.tsx` | Volume slider + mute toggle |
| `TrackProgressBar` | `electron-app/src/components/TrackProgressBar.tsx` | Playback progress + seek |
| `ErrorBoundary` | `electron-app/src/components/ErrorBoundary.tsx` | Catches render errors (class component) |
| `OAuthCallback` | `electron-app/src/components/OAuthCallback.tsx` | Handles OAuth redirect |

---

## 📖 Resources

- [React Documentation](https://react.dev/) — Official React 19 docs
- [Thinking in React](https://react.dev/learn/thinking-in-react) — Component design philosophy
- [React API Reference](https://react.dev/reference/react) — Hooks, components, APIs
