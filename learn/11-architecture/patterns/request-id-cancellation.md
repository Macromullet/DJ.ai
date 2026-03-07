# Request ID Cancellation Pattern

## The Concept

Asynchronous operations can overlap: a user clicks "play" on Track A, then quickly clicks Track B while Track A's audio is still loading. Without cancellation, both audio streams complete and you hear a cacophony — or worse, Track A finishes loading *after* Track B and overwrites the current playback.

The **request ID cancellation pattern** solves this by assigning an **incrementing ID** to each operation. Before processing a result, the code checks whether the ID still matches the current request. If it doesn't, the result is stale and is silently discarded.

```typescript
let currentRequestId = 0;

async function speak(text: string) {
  const myId = ++currentRequestId; // Claim a new ID

  const audio = await generateAudio(text); // Async work

  if (myId !== currentRequestId) return; // Stale — a newer request took over

  playAudio(audio); // Still current — proceed
}

function stop() {
  currentRequestId++; // Invalidate any in-flight request
}
```

### Why Not AbortController?

`AbortController` cancels the *fetch request* itself, but many async operations involve multiple steps beyond the initial fetch (decoding, WAV conversion, audio element creation). Request IDs invalidate the **entire pipeline** — even after the network call completes.

## How DJ.ai Uses This Pattern

### TTS Services

All TTS services in DJ.ai use `requestId` to prevent concurrent playback:

```typescript
class GeminiTTSService {
  private requestId = 0;

  async speak(text: string): Promise<void> {
    const myRequestId = ++this.requestId;

    // Step 1: Generate audio (network call)
    const pcmData = await this.generateSpeech(text);
    if (myRequestId !== this.requestId) return; // Check after network

    // Step 2: Convert PCM to WAV
    const wavBlob = this.pcmToWav(pcmData);
    if (myRequestId !== this.requestId) return; // Check after conversion

    // Step 3: Create audio element and play
    const url = URL.createObjectURL(wavBlob);
    if (myRequestId !== this.requestId) {
      URL.revokeObjectURL(url); // Clean up abandoned blob
      return;
    }

    this.audio = new Audio(url);
    await this.audio.play();
  }

  stop(): void {
    this.requestId++; // Invalidate all in-flight requests
    this.audio?.pause();
  }
}
```

### Play Request ID in MusicPlayer

The music player uses a similar pattern for track transitions:

```typescript
const playRequestIdRef = useRef(0);

async function playTrack(track: Track) {
  const myId = ++playRequestIdRef.current;

  const streamUrl = await provider.getStreamUrl(track);
  if (myId !== playRequestIdRef.current) return; // User already skipped

  setCurrentTrack(track);
  audioElement.src = streamUrl;
  await audioElement.play();
}
```

### The Cancellation Checks

Place checks **after every async boundary** — anywhere execution yields to the event loop:

1. After `await fetch()` — network call completed
2. After `await decode()` — audio processing completed
3. After `await audioElement.play()` — playback started
4. Before creating resources (Blob URLs) that need cleanup

## DJ.ai Connection

The request ID pattern is used throughout DJ.ai's TTS services (`GeminiTTSService`, `EdgeTTSService`) and the music player's track transition logic. `playRequestIdRef` prevents concurrent play races when users rapidly skip tracks. `this.requestId` in TTS services ensures only the most recent commentary plays. The pattern is simple, has zero dependencies, and handles complex async pipelines gracefully.

## Key Takeaways

- Incrementing IDs invalidate stale async operations without aborting network requests
- Check the ID after every `await` — any yield point can become stale
- Clean up resources (Blob URLs, audio elements) in the stale-detection branch
- Combine with `useRef` in React to avoid stale closure issues

## Further Reading

- [React Docs: Race Conditions in Data Fetching](https://react.dev/learn/you-might-not-need-an-effect#fetching-data)
- [JavaScript.info: Async Iteration and Generators](https://javascript.info/async-iterators-generators)
- [Kent C. Dodds: How to Cancel Requests](https://kentcdodds.com/blog/how-to-cancel-pending-api-requests-to-show-correct-data)
