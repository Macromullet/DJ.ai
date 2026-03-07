# URL and Blob APIs

> Creating playable audio from binary data — how DJ.ai converts TTS responses into sound.

The `Blob` and `URL.createObjectURL` APIs are the bridge between binary audio data and the HTML `Audio` element. When DJ.ai's TTS services (OpenAI, ElevenLabs, Gemini) return audio as binary data, it's wrapped in a `Blob`, converted to an object URL, and fed to an `Audio` element for playback. Proper cleanup with `URL.revokeObjectURL` prevents memory leaks.

---

## Core Concepts

### Blob (Binary Large Object)

A `Blob` represents immutable raw binary data with a MIME type:

```typescript
// Create a Blob from binary data
const audioData = new Uint8Array([/* raw audio bytes */]);
const blob = new Blob([audioData], { type: 'audio/mpeg' });

console.log(blob.size); // Size in bytes
console.log(blob.type); // "audio/mpeg"
```

### URL.createObjectURL

`URL.createObjectURL()` creates a special URL that points to a Blob in memory. This URL can be used as the `src` of an `Audio` or `Video` element:

```typescript
const blob = new Blob([audioData], { type: 'audio/mpeg' });
const url = URL.createObjectURL(blob);
// url looks like: "blob:http://localhost:5173/abc-def-123"

const audio = new Audio(url);
await audio.play(); // Plays the audio from the Blob
```

### The Full TTS Audio Pipeline in DJ.ai

```typescript
// 1. TTS service renders speech to a Blob
class OpenAITTSService implements ITTSService {
  async renderToBlob(text: string): Promise<Blob> {
    // Call OpenAI API via Electron's CORS proxy
    const response = await window.electron.aiProxy.ttsRequest({
      url: 'https://api.openai.com/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: 'alloy',
      }),
    });

    // Response contains base64-encoded audio
    const binary = atob(response.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: response.contentType });
  }

  // 2. Play from a pre-rendered Blob
  async speakFromBlob(blob: Blob): Promise<void> {
    const url = URL.createObjectURL(blob);
    try {
      const audio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed'));
        audio.play();
      });
    } finally {
      URL.revokeObjectURL(url); // Always clean up!
    }
  }
}
```

### Memory Management with revokeObjectURL

**Critical:** Every `createObjectURL` call allocates memory that isn't garbage-collected until you explicitly call `revokeObjectURL` or the page unloads. In a long-running Electron app like DJ.ai, failing to revoke URLs causes memory leaks:

```typescript
// WRONG: memory leak — URL never revoked
const url = URL.createObjectURL(blob);
new Audio(url).play();
// The Blob stays in memory forever!

// CORRECT: revoke after playback completes
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.onended = () => URL.revokeObjectURL(url);
audio.onerror = () => URL.revokeObjectURL(url);
await audio.play();
```

### Pre-Generation Cache

DJ.ai's auto-DJ feature pre-generates TTS audio for the next track while the current track plays. The pre-rendered Blob is stored in a ref and played instantly during transitions:

```typescript
// Pre-generate during current track playback
const preGenCacheRef = useRef<Map<string, { commentary: string; audioBlob?: Blob }>>(
  new Map()
);

// Pre-generate for next track
async function preGenerateForTrack(trackId: string, title: string, artist: string) {
  const commentary = await aiService.generateCommentary(title, artist);
  const audioBlob = ttsService.renderToBlob
    ? await ttsService.renderToBlob(commentary.text)
    : undefined;

  preGenCacheRef.current.set(trackId, { commentary: commentary.text, audioBlob });
}

// During track transition — instant playback from cache
function onTrackChange(nextTrack: Track) {
  const cached = preGenCacheRef.current.get(nextTrack.id);
  if (cached?.audioBlob && ttsService.speakFromBlob) {
    await ttsService.speakFromBlob(cached.audioBlob); // Instant!
  } else {
    await ttsService.speak(cached?.commentary ?? '');   // Real-time generation
  }
}
```

### Blob from Fetch Response

You can create a Blob directly from a fetch response:

```typescript
const response = await fetch('https://api.example.com/audio');
const blob = await response.blob(); // Response body as Blob
const url = URL.createObjectURL(blob);
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/services/OpenAITTSService.ts`** — `renderToBlob()` creates audio Blobs from base64 API responses; `speakFromBlob()` plays them via `URL.createObjectURL` + `Audio`
- **`electron-app/src/services/ElevenLabsTTSService.ts`** — Same pattern with ElevenLabs API responses
- **`electron-app/src/services/GeminiTTSService.ts`** — Same pattern with Google Gemini TTS
- **`electron-app/src/App.tsx`** — `preGenCacheRef` stores pre-rendered audio Blobs for seamless track transitions; cleanup logic revokes URLs when Blobs are evicted from cache

---

## 🎯 Key Takeaways

- **`Blob`** wraps binary audio data with a MIME type
- **`URL.createObjectURL(blob)`** creates a URL that an `Audio` element can play
- **Always call `URL.revokeObjectURL(url)`** after playback to prevent memory leaks
- DJ.ai's TTS pipeline: API → base64 → `Blob` → `createObjectURL` → `Audio.play()` → `revokeObjectURL`
- **Pre-generation** stores Blobs in a cache ref for instant playback during track transitions
- This pattern applies to all paid TTS services (`renderToBlob` / `speakFromBlob`) but NOT WebSpeech

---

## 📖 Resources

- [URL.createObjectURL (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) — Creating object URLs
- [URL.revokeObjectURL (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) — Memory cleanup
- [Blob (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Blob) — Blob API reference
- [Using files from web applications (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications) — File and Blob usage patterns
