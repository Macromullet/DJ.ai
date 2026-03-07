# Closures and Scope

> Lexical scope, closures, and the stale closure problem — a critical pattern in DJ.ai's React code.

A closure is a function that "remembers" the variables from the scope where it was created, even after that scope has finished executing. Closures are fundamental to JavaScript and are used everywhere in DJ.ai — from event handlers to React hooks. However, closures can also cause subtle bugs called **stale closures**, which DJ.ai explicitly combats using `useRef`.

---

## Core Concepts

### Lexical Scope

JavaScript uses **lexical (static) scoping** — a function's scope is determined by where it's written in the source code, not where it's called:

```javascript
function createGreeter(name) {
  // `name` is in this function's scope
  return function greet() {
    console.log(`Hello, ${name}!`); // `greet` closes over `name`
  };
}

const greetAlice = createGreeter("Alice");
greetAlice(); // "Hello, Alice!" — `name` is remembered
```

### Closures

A closure is created when a function accesses variables from an outer scope. The inner function keeps a reference to the outer scope's variables:

```javascript
function createCounter() {
  let count = 0; // Closed over by increment and getCount
  return {
    increment: () => ++count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment();
counter.increment();
console.log(counter.getCount()); // 2
```

### The Stale Closure Problem

In React, closures capture state **at the time the closure is created**. If state changes later, the closure still sees the old value. This is the **stale closure** bug — and it's one of the most common React pitfalls.

```typescript
// BUG: stale closure
function Player() {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // This closure captures `isPlaying` as `false` on first render
    const handleTrayClick = () => {
      console.log(isPlaying); // Always false! Stale closure.
      setIsPlaying(!isPlaying);
    };
    window.electron.tray.onPlaybackToggle(handleTrayClick);
  }, []); // Empty deps — runs only once, never recaptures
}
```

### DJ.ai's Solution: Ref-Based Handlers

DJ.ai solves stale closures by storing current state in **refs** that the closure reads at call time:

```typescript
// CORRECT: ref avoids stale closure
function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const handleTrayClick = () => {
      // Reads current value from ref — always fresh
      const current = isPlayingRef.current;
      setIsPlaying(!current);
    };
    window.electron.tray.onPlaybackToggle(handleTrayClick);
  }, []); // Still runs once, but ref is always current
}
```

This pattern is used extensively in `App.tsx` for callbacks registered with Electron's main process (tray, keyboard shortcuts, IPC handlers) where React state would be stale.

### Closures in IPC Handlers

Electron IPC handlers are registered once and persist for the app's lifetime. Without refs, every handler would close over the initial state:

```javascript
// electron/main.cjs — closure over mainWindow
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({ /* ... */ });
}

// This IPC handler closes over `mainWindow`
ipcMain.handle('show-notification', (event, options) => {
  if (mainWindow) { // Always reads the current `mainWindow` (let, not const)
    mainWindow.webContents.send('notification', options);
  }
});
```

Using `let` instead of `const` for `mainWindow` means the closure always reads the latest value of the variable (since it captures the variable binding, not the value).

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Uses `isPlayingRef`, `playlistRef`, `currentTrackRef`, `settingsRef`, `autoDJModeRef`, `ttsEnabledRef`, `isTransitioningRef`, `playRequestIdRef`, and `preGenCacheRef` — all to avoid stale closures in tray callbacks, keyboard handlers, and auto-DJ lookahead logic
- **`electron-app/electron/main.cjs`** — IPC handlers close over `mainWindow`, `oauthWindow`, and `tray` variables; uses `let` so closures always see the latest reference
- **`electron-app/electron/preload.cjs`** — Closures capture `ipcRenderer` callbacks for the context bridge
- **`electron-app/src/components/Toast.tsx`** — The `useToast` hook uses closure-based state management for the toast queue

---

## 🎯 Key Takeaways

- **Closures** capture variables from their enclosing scope — this is how React hooks work
- **Stale closures** occur when a closure captures a value that later changes (common in `useEffect` with `[]` deps)
- DJ.ai uses **`useRef`** to provide always-current values to closures registered once (tray, IPC, keyboard)
- **`let`** variables in closures always reflect the latest value (the binding is captured, not the value)
- This pattern appears **9+ times** in App.tsx — it's one of the most critical patterns to understand

---

## 📖 Resources

- [Closures (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures) — Comprehensive closure guide
- [A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/) — Dan Abramov on stale closures in React
- [Lexical Scoping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures#lexical_scoping) — How scope chains work
