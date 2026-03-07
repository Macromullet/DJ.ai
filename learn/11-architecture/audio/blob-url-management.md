# Blob URL Management

## The Concept

`URL.createObjectURL()` creates an in-memory URL that points to binary data (audio, images, files). The browser keeps the data in memory **until** you explicitly call `URL.revokeObjectURL()` or the page unloads. Without cleanup, every Blob URL leaks memory.

```typescript
// Create a Blob URL — memory is allocated
const url = URL.createObjectURL(audioBlob);

// Use it
audio.src = url;

// CRITICAL: Revoke when done — frees memory
URL.revokeObjectURL(url);
```

### Why Blob URLs Leak

Each `createObjectURL()` call:
1. Stores the binary data in browser memory
2. Creates a URL string mapping (e.g., `blob:http://localhost:5173/abc-123`)
3. The browser holds a reference, preventing garbage collection

If you create 100 Blob URLs without revoking them, the browser holds 100 audio blobs in memory — potentially hundreds of MB for audio data.

### The Lifecycle

```
createObjectURL(blob)     → Memory allocated, URL created
Use URL (audio.src = url) → URL is accessible
revokeObjectURL(url)      → URL invalidated, memory freed
                            (existing references continue to work
                             until audio element is done)
```

## How DJ.ai Manages Blob URLs

DJ.ai's TTS services track the current Blob URL and revoke it on `stop()` or before creating a new one:

```typescript
class GeminiTTSService {
  private currentObjectUrl: string | null = null;
  private audio: HTMLAudioElement | null = null;

  async speak(text: string): Promise<void> {
    // Clean up previous Blob URL before creating new one
    this.cleanup();

    const wavBlob = await this.generateAndConvert(text);
    this.currentObjectUrl = URL.createObjectURL(wavBlob);

    this.audio = new Audio(this.currentObjectUrl);
    this.audio.onended = () => this.cleanup();
    await this.audio.play();
  }

  stop(): void {
    this.audio?.pause();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.audio = null;
  }
}
```

### Cleanup Points

DJ.ai revokes Blob URLs in three situations:

1. **Before creating a new one** — In `speak()`, clean up the previous URL first
2. **When playback ends** — The `onended` event triggers cleanup
3. **When stopped** — The `stop()` method cleans up immediately

### The Cancellation Pattern Interaction

When using the [request ID cancellation pattern](../patterns/request-id-cancellation.md), stale requests must also clean up their Blob URLs:

```typescript
async speak(text: string): Promise<void> {
  const myId = ++this.requestId;
  const wavBlob = await this.generateAudio(text);

  if (myId !== this.requestId) {
    // Request is stale — DON'T create an orphaned Blob URL
    return;
  }

  // Safe to proceed
  this.currentObjectUrl = URL.createObjectURL(wavBlob);
}
```

## DJ.ai Connection

Blob URL management appears in all TTS services in `electron-app/src/services/`. The `currentObjectUrl` field tracks the active URL, and `cleanup()` revokes it at every transition point. This prevents memory leaks during extended listening sessions where dozens of TTS clips are generated and played.

## Key Takeaways

- Every `createObjectURL()` must have a matching `revokeObjectURL()` — no exceptions
- Track the current URL in an instance variable for reliable cleanup
- Revoke at three points: before creating a new one, on playback end, and on stop
- Stale async operations should skip URL creation to avoid orphaned blobs

## Further Reading

- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)
- [MDN: URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
- [Memory Leaks in Single-Page Apps](https://nolanlawson.com/2020/02/19/fixing-memory-leaks-in-web-applications/)
