# Blob URL Lifecycle

## The Concept

`URL.createObjectURL()` creates an in-memory URL pointing to binary data. In DJ.ai, these URLs represent TTS audio clips — WAV files generated from AI commentary. Without careful lifecycle management, each URL **leaks memory** because the browser holds a reference to the underlying data until `URL.revokeObjectURL()` is called.

### The Lifecycle

```
1. CREATE    → URL.createObjectURL(blob)       → Memory allocated
2. USE       → audio.src = url                  → Audio playing
3. REVOKE    → URL.revokeObjectURL(url)         → Memory freed
```

Skip step 3 and the blob stays in memory forever. In a music app that generates TTS for every track, this means **megabytes of leaked audio data per hour.**

## The Complete Pattern

```typescript
class TTSService {
  private currentObjectUrl: string | null = null;
  private audio: HTMLAudioElement | null = null;

  async speak(text: string): Promise<void> {
    // 1. Clean up BEFORE creating new resources
    this.revokeCurrentUrl();

    // 2. Generate new audio
    const blob = await this.generateAudio(text);

    // 3. Create URL and track it
    this.currentObjectUrl = URL.createObjectURL(blob);

    // 4. Play with cleanup handlers
    this.audio = new Audio(this.currentObjectUrl);

    this.audio.onended = () => {
      this.revokeCurrentUrl();  // Clean up when done
    };

    this.audio.onerror = () => {
      this.revokeCurrentUrl();  // Clean up on error too
    };

    await this.audio.play();
  }

  stop(): void {
    this.audio?.pause();
    this.revokeCurrentUrl();
  }

  private revokeCurrentUrl(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.audio = null;
  }
}
```

### The Four Cleanup Points

| When | Why |
|------|-----|
| Before creating a new URL | Previous audio is no longer needed |
| On `audio.onended` | Playback finished naturally |
| On `audio.onerror` | Playback failed — clean up anyway |
| On `stop()` | User or system stopped playback |

### Common Mistakes

```typescript
// ❌ Leak: URL created but never revoked
const url = URL.createObjectURL(blob);
audio.src = url;
// ...nothing calls revokeObjectURL

// ❌ Leak: Error path doesn't clean up
try {
  const url = URL.createObjectURL(blob);
  await play(url);
  URL.revokeObjectURL(url); // Only reached on success
} catch (e) {
  // URL leaked!
}

// ✅ Safe: cleanup in finally block
const url = URL.createObjectURL(blob);
try {
  await play(url);
} finally {
  URL.revokeObjectURL(url);
}
```

### Interaction with Request ID Cancellation

When a stale async operation completes, it must NOT create an orphaned Blob URL:

```typescript
async speak(text: string): Promise<void> {
  const myId = ++this.requestId;
  const blob = await this.generateAudio(text);

  // If stale, don't create a URL that can never be revoked
  if (myId !== this.requestId) return;

  this.currentObjectUrl = URL.createObjectURL(blob);
  // ...proceed with playback
}
```

## DJ.ai Connection

All TTS services in `electron-app/src/services/` track `currentObjectUrl` and call `revokeObjectURL()` at every lifecycle transition. This prevents memory growth during long listening sessions where dozens of TTS clips are generated. The pattern works alongside request ID cancellation to ensure stale operations don't create orphaned URLs.

## Key Takeaways

- Every `createObjectURL()` must have a matching `revokeObjectURL()`
- Track the current URL in an instance variable — not a local variable
- Clean up on all paths: success, error, stop, and before creating a new URL
- Stale async operations must not create URLs they can't revoke

## Further Reading

- [MDN: URL.createObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)
- [MDN: URL.revokeObjectURL()](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)
- [Nolan Lawson: Fixing Memory Leaks](https://nolanlawson.com/2020/02/19/fixing-memory-leaks-in-web-applications/)
