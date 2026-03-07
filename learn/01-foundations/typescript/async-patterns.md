# TypeScript Async Patterns

> Promises, async/await, and error handling — the backbone of DJ.ai's non-blocking architecture.

DJ.ai is **async everywhere**: OAuth token exchanges, music API searches, AI commentary generation, text-to-speech rendering, and playback control are all asynchronous operations. Every method in `IMusicProvider` returns a `Promise`. Understanding TypeScript's async patterns is essential to working with any part of the codebase.

---

## Core Concepts

### Promises

A `Promise` represents a value that will be available in the future. It can be in one of three states: **pending**, **fulfilled**, or **rejected**.

```typescript
// Creating a promise
const fetchTrack = new Promise<SearchResult>((resolve, reject) => {
  // Async work happens here
  if (found) resolve(track);
  else reject(new Error("Track not found"));
});

// Consuming a promise with .then/.catch
fetchTrack
  .then(track => console.log(track.title))
  .catch(error => console.error(error.message));
```

### Async/Await

`async/await` is syntactic sugar over Promises — it makes asynchronous code read like synchronous code. DJ.ai uses `async/await` exclusively (no raw `.then()` chains).

```typescript
// DJ.ai pattern: async method returning typed Promise
async function searchAndPlay(provider: IMusicProvider, query: string): Promise<void> {
  const results = await provider.searchTracks(query);
  if (results.length > 0) {
    await provider.playTrack(results[0]);
  }
}
```

The `await` keyword pauses execution until the Promise resolves, then returns the resolved value. If the Promise rejects, it throws an error that can be caught with `try/catch`.

### Error Handling with try/catch

DJ.ai wraps all async operations in try/catch blocks, often showing user-friendly toast notifications on failure:

```typescript
// Pattern from App.tsx — error handling for search
const handleSearch = async (query: string) => {
  try {
    setIsSearching(true);
    const results = await currentProvider.searchTracks(query);
    setSearchResults(results);
  } catch (error) {
    console.error("Search failed:", error);
    showToast("Search failed. Please try again.", "error");
  } finally {
    setIsSearching(false);
  }
};
```

Key patterns:
- **`try`** — wrap the happy path
- **`catch`** — handle failures gracefully (log + user notification)
- **`finally`** — always runs; perfect for resetting loading state

### Promise.all — Parallel Execution

When multiple async operations are independent, run them in parallel:

```typescript
// Fetch recommendations and commentary at the same time
const [recommendations, commentary] = await Promise.all([
  provider.getRecommendations(currentTrack, 5),
  aiService.generateCommentary(track.title, track.artist, track.album),
]);
```

`Promise.all` rejects immediately if **any** promise rejects. Use `Promise.allSettled` when you want all results regardless of individual failures.

### Promise.allSettled — Graceful Parallel Execution

```typescript
const results = await Promise.allSettled([
  provider.searchTracks("Queen"),
  provider.getUserTopTracks(),
]);

results.forEach((result, i) => {
  if (result.status === "fulfilled") {
    console.log(`Operation ${i} succeeded:`, result.value);
  } else {
    console.error(`Operation ${i} failed:`, result.reason);
  }
});
```

### Typing Async Functions

In TypeScript, an `async` function always returns `Promise<T>`:

```typescript
// Return type is Promise<SearchResult[]>
async function search(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/search?q=${query}`);
  return response.json(); // TypeScript infers the return
}

// Void async functions return Promise<void>
async function playTrack(track: SearchResult): Promise<void> {
  await audioPlayer.play(track.id);
}
```

### Avoiding Common Pitfalls

**Fire-and-forget (missing await):**
```typescript
// BUG: forgetting `await` means errors are silently swallowed
provider.playTrack(track); // ← Missing await!

// CORRECT:
await provider.playTrack(track);
```

**Sequential when parallel is possible:**
```typescript
// SLOW: sequential — each waits for the previous
const recs = await provider.getRecommendations(track);
const tops = await provider.getUserTopTracks();

// FAST: parallel — both run at the same time
const [recs, tops] = await Promise.all([
  provider.getRecommendations(track),
  provider.getUserTopTracks(),
]);
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/types/IMusicProvider.ts`** — Every method returns `Promise<T>`: `searchTracks()` → `Promise<SearchResult[]>`, `authenticate()` → `Promise<AuthenticationResult>`, `playTrack()` → `Promise<string>`
- **`electron-app/src/App.tsx`** — All event handlers are async with try/catch error handling; uses `finally` blocks for loading state cleanup
- **`electron-app/src/providers/YouTubeMusicProvider.ts`** — Token refresh logic uses async/await with retry patterns
- **`electron-app/src/services/AICommentaryService.ts`** — Async commentary generation with in-memory caching; pre-generation uses `renderToBlob` for seamless transitions
- **`electron-app/src/components/OAuthCallback.tsx`** — Async OAuth code exchange in a `useEffect` hook

---

## 🎯 Key Takeaways

- **Every** `IMusicProvider` method is async — always `await` the result
- Use **try/catch/finally** for error handling; show user-friendly messages via toast
- Use **`Promise.all`** for independent parallel operations (recommendations + commentary)
- **Never forget `await`** — unhandled promise rejections are silent bugs
- TypeScript enforces return types: `async` functions always return `Promise<T>`

---

## 📖 Resources

- [Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous) — MDN's comprehensive async guide
- [Using Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises) — Promise fundamentals
- [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) — async/await reference
- [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) — Parallel promise execution
- [Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) — Graceful parallel execution
