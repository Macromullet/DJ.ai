# The JavaScript Event Loop

> Microtasks, macrotasks, and async scheduling — how JavaScript handles concurrency without threads.

JavaScript is **single-threaded** — only one piece of code runs at a time. Yet DJ.ai handles simultaneous music playback, AI commentary generation, TTS audio, and UI updates without freezing. This is possible because of the **event loop**, which coordinates async operations by queuing callbacks and processing them in a specific order.

---

## Core Concepts

### The Event Loop Model

The event loop continuously checks for work in three areas:

```
┌─────────────────────────────────┐
│          Call Stack              │  ← Currently executing code
└──────────────┬──────────────────┘
               │ (empty?)
               ▼
┌─────────────────────────────────┐
│       Microtask Queue           │  ← Promises, queueMicrotask()
│  (ALL drained before next step) │
└──────────────┬──────────────────┘
               │ (empty?)
               ▼
┌─────────────────────────────────┐
│       Macrotask Queue           │  ← setTimeout, setInterval, I/O
│  (ONE task per loop iteration)  │
└──────────────┬──────────────────┘
               │
               ▼
         Render / Paint (browser)
```

### Microtasks vs Macrotasks

| Category | Examples | Priority |
|----------|----------|----------|
| **Microtasks** | `Promise.then()`, `queueMicrotask()`, `MutationObserver` | High — ALL run before any macrotask |
| **Macrotasks** | `setTimeout()`, `setInterval()`, `setImmediate()`, I/O callbacks, UI events | Low — ONE per loop iteration |

The key insight: **all microtasks are drained** before the next macrotask runs. This means Promise chains always complete before timers fire.

```javascript
console.log("1 - synchronous");

setTimeout(() => console.log("2 - macrotask (setTimeout)"), 0);

Promise.resolve().then(() => console.log("3 - microtask (Promise)"));

queueMicrotask(() => console.log("4 - microtask (queueMicrotask)"));

console.log("5 - synchronous");

// Output order: 1, 5, 3, 4, 2
// Synchronous → Microtasks → Macrotasks
```

### queueMicrotask

`queueMicrotask()` schedules a callback as a microtask — it runs after the current synchronous code but before any macrotasks. DJ.ai uses this pattern for simulating async completion in mock/test scenarios:

```javascript
// Simulating async audio completion
queueMicrotask(() => {
  audioElement.dispatchEvent(new Event('ended'));
});
```

This ensures the 'ended' event fires asynchronously (not synchronously inline) but before any pending timers or I/O callbacks.

### async/await and the Event Loop

`await` pauses the async function and schedules the continuation as a **microtask** when the awaited Promise resolves:

```typescript
async function playNextTrack() {
  console.log("A"); // Synchronous
  const track = await provider.searchTracks("Queen"); // Pauses here
  console.log("B"); // Runs as microtask when search resolves
}

playNextTrack();
console.log("C"); // Runs while playNextTrack is paused

// Output: A, C, B
```

### requestAnimationFrame

For visual updates (like DJ.ai's audio visualizer), `requestAnimationFrame` runs callbacks before the browser's next repaint — approximately 60 times per second:

```typescript
// From AudioVisualizer.tsx pattern
function animate() {
  analyser.getByteFrequencyData(dataArray);
  // Update Three.js scene with frequency data
  renderer.render(scene, camera);
  requestAnimationFrame(animate); // Schedule next frame
}
requestAnimationFrame(animate);
```

`requestAnimationFrame` is neither a microtask nor a macrotask — it's a special render-phase callback.

### Real-World Event Loop in DJ.ai

When a user clicks "Next Track" in DJ.ai, here's what happens in event loop terms:

```
1. Click event handler (macrotask) runs:
   → Calls `await provider.next()`
   → Suspends, returns to event loop

2. Network I/O completes (macrotask queued)
   → Provider.next() Promise resolves
   → Continuation scheduled as microtask

3. Microtask runs:
   → Sets new track state
   → React schedules re-render (microtask)

4. React re-render microtask:
   → Virtual DOM diffing
   → Schedules DOM updates

5. Browser paint:
   → New track title appears on screen
   → AudioVisualizer's requestAnimationFrame updates

6. Meanwhile, auto-DJ lookahead (setTimeout callback):
   → Pre-generates commentary for the next track
   → Pre-renders TTS audio blob
```

All of this happens on a single thread, orchestrated by the event loop.

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Auto-DJ lookahead uses `setTimeout` (macrotask) to delay pre-generation; state updates trigger React microtask re-renders
- **`electron-app/src/components/AudioVisualizer.tsx`** — `requestAnimationFrame` loop for 60fps GPU visualization
- **`electron-app/src/services/WebSpeechTTSService.ts`** — `SpeechSynthesis.speak()` is async via browser event loop; `onend` fires as a macrotask callback
- **`electron-app/electron/main.cjs`** — IPC message handling is event-loop-driven; `ipcMain.handle()` callbacks are scheduled as macrotasks
- **`electron-app/src/components/Toast.tsx`** — Toast auto-dismiss uses `setTimeout` (macrotask) with cleanup in `useEffect`

---

## 🎯 Key Takeaways

- JavaScript is **single-threaded** — the event loop provides concurrency without parallelism
- **Microtasks** (Promises, `queueMicrotask`) always run before **macrotasks** (`setTimeout`, I/O)
- `await` schedules continuations as microtasks — they run ASAP after the current code
- **`requestAnimationFrame`** is for visual updates — runs before browser paint (~60fps)
- Understanding the event loop explains why DJ.ai can play music, generate commentary, and update the UI simultaneously without threads

---

## 📖 Resources

- [The Event Loop (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop) — Official event loop explainer
- [Event Loop Explained (javascript.info)](https://javascript.info/event-loop) — Detailed walkthrough with examples
- [Jake Archibald: In The Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0) — Excellent visual talk on the event loop
- [queueMicrotask (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask) — Microtask scheduling API
- [requestAnimationFrame (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — Animation frame API
