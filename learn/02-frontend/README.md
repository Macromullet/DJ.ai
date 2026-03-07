# 02 — Frontend

> React 19, Vite, React Router, and Web APIs — the technologies powering DJ.ai's renderer process.

DJ.ai's frontend is a **React 19** single-page application running inside Electron's renderer process. It's built with **Vite** for fast development (HMR) and optimized production bundles, uses **React Router** for client-side navigation (including OAuth callback handling), and leverages browser **Web APIs** for audio visualization, text-to-speech, and local storage.

---

## 🗺️ Learning Path

```
React 19 (UI framework)
├── Hooks
│   ├── useState & useReducer ──── State management
│   ├── useEffect ──────────────── Side effects & cleanup
│   ├── useRef ─────────────────── Mutable refs, avoiding stale closures
│   ├── useCallback & useMemo ──── Memoization & performance
│   └── Custom Hooks ───────────── Extracting reusable logic
├── Component Patterns ─────────── Composition, children, props
├── Error Boundaries ───────────── Catching rendering errors
└── State Management ───────────── Lifted state, localStorage, no Redux

React Router DOM (routing)
├── Routing Basics ─────────────── Routes, params, navigation
└── OAuth Callbacks ────────────── Handling auth redirects in SPAs

Vite (build tool)
├── Dev Server ─────────────────── HMR, module graph, port config
├── Build & Optimization ───────── Tree shaking, code splitting
└── Configuration ──────────────── vite.config.ts, plugins

Web APIs (browser platform)
├── Web Audio API ──────────────── AudioContext, frequency analysis
├── Web Speech API ─────────────── SpeechSynthesis for free TTS
├── URL & Blob ─────────────────── Object URLs for audio playback
└── localStorage ───────────────── Token & settings persistence
```

---

## 📚 Topics

### [React](./react/README.md)
The UI framework for DJ.ai's entire interface — from the search bar to the playback controls.

- **[Hooks](./react/hooks/README.md)** — The foundation of DJ.ai's React code
  - [useState & useReducer](./react/hooks/useState-and-useReducer.md)
  - [useEffect](./react/hooks/useEffect.md)
  - [useRef](./react/hooks/useRef.md)
  - [useCallback & useMemo](./react/hooks/useCallback-and-useMemo.md)
  - [Custom Hooks](./react/hooks/custom-hooks.md)
- [Component Patterns](./react/component-patterns.md) — Composition and reusability
- [Error Boundaries](./react/error-boundaries.md) — Graceful error handling
- [State Management](./react/state-management.md) — DJ.ai's approach without Redux

### [React Router](./react-router/README.md)
Client-side routing for navigation and OAuth callback handling.

- [Routing Basics](./react-router/routing-basics.md) — Routes, params, navigation
- [OAuth Callbacks](./react-router/oauth-callbacks.md) — Handling auth redirects

### [Vite](./vite/README.md)
The build tool that serves DJ.ai in development and bundles it for production.

- [Dev Server](./vite/dev-server.md) — HMR, module graph, port configuration
- [Build & Optimization](./vite/build-and-optimization.md) — Production builds
- [Configuration](./vite/config.md) — vite.config.ts customization

### [Web APIs](./web-apis/README.md)
Browser platform APIs that DJ.ai uses for audio, speech, and storage.

- [Web Audio API](./web-apis/web-audio-api.md) — GPU-accelerated audio visualization
- [Web Speech API](./web-apis/web-speech-api.md) — Free browser-native TTS
- [URL & Blob](./web-apis/url-and-blob.md) — Audio blob management
- [localStorage](./web-apis/local-storage.md) — Client-side persistence

---

## 🎯 Key Takeaways

- DJ.ai uses **React 19** with functional components and hooks — no class components (except ErrorBoundary)
- **No state management library** (Redux, Zustand) — state is lifted to App.tsx and synced to localStorage
- **Vite** provides sub-second HMR in development and tree-shaken bundles in production
- **React Router** handles the OAuth callback route (`/oauth/callback`)
- Browser Web APIs provide **free** TTS, audio visualization, and client-side storage
- All frontend code lives in `electron-app/src/` and is written in TypeScript
