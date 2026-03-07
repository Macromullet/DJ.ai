# Streams and Buffers

> Binary data handling in Node.js — how DJ.ai transfers TTS audio between processes.

Node.js provides several ways to work with binary data: `Buffer`, `ArrayBuffer`, `Blob`, and `Stream`. DJ.ai uses these primitives extensively for text-to-speech audio — TTS services generate audio as binary blobs, which are transferred between the Electron main process and renderer via IPC, often encoded as **base64 strings** for safe serialization.

---

## Core Concepts

### Buffer

`Buffer` is Node.js's built-in class for working with binary data. It represents a fixed-length sequence of bytes and provides methods for reading, writing, and converting binary data:

```javascript
// Create a buffer from a string
const buf = Buffer.from("Hello, DJ.ai!", "utf-8");
console.log(buf.length);        // 13 bytes
console.log(buf.toString());    // "Hello, DJ.ai!"

// Convert to base64 (for safe text serialization)
const base64 = buf.toString("base64");
console.log(base64);            // "SGVsbG8sIERKLmFpIQ=="

// Convert back from base64
const decoded = Buffer.from(base64, "base64");
console.log(decoded.toString()); // "Hello, DJ.ai!"
```

### Base64 Encoding

Base64 converts binary data into ASCII text. This is essential for DJ.ai's IPC because Electron's `ipcRenderer.invoke()` serializes data as JSON — and JSON cannot safely contain raw binary bytes.

```javascript
// In the main process (main.cjs) — TTS API returns binary audio
const response = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}` },
  body: JSON.stringify({ model: "tts-1", input: text, voice: "alloy" }),
});

const audioBuffer = Buffer.from(await response.arrayBuffer());
const base64Audio = audioBuffer.toString("base64");
// Send base64 string to renderer via IPC
return { audio: base64Audio, contentType: "audio/mpeg" };
```

```typescript
// In the renderer (React) — convert base64 back to playable audio
const binary = atob(response.audio);
const bytes = new Uint8Array(binary.length);
for (let i = 0; i < binary.length; i++) {
  bytes[i] = binary.charCodeAt(i);
}
const blob = new Blob([bytes], { type: response.contentType });
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
await audio.play();
```

### ArrayBuffer and TypedArrays

`ArrayBuffer` is the Web API equivalent of Node.js `Buffer` — a fixed-length raw binary data buffer. `TypedArrays` (like `Uint8Array`, `Float32Array`) provide views into an ArrayBuffer:

```typescript
// Web Audio API uses Float32Array for audio samples
const analyser = audioContext.createAnalyser();
const dataArray = new Float32Array(analyser.frequencyBinCount);
analyser.getFloatFrequencyData(dataArray);
// dataArray now contains frequency magnitudes in decibels
```

DJ.ai's `AudioVisualizer` uses `Uint8Array` for frequency data:

```typescript
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
// Values 0-255 representing frequency magnitudes
```

### Blob

`Blob` (Binary Large Object) is the browser's high-level binary data type. Unlike `Buffer` (Node.js only), `Blob` is available in the renderer process:

```typescript
// TTS service renders audio to a Blob for pre-caching
const audioBlob = await ttsService.renderToBlob("Now playing Bohemian Rhapsody");

// Later, play the pre-rendered audio instantly
const url = URL.createObjectURL(audioBlob);
const audio = new Audio(url);
await audio.play();

// Clean up to prevent memory leaks
URL.revokeObjectURL(url);
```

### Stream

Streams process data piece-by-piece instead of loading everything into memory. While DJ.ai doesn't use Node.js streams directly in the frontend, the concept is important for understanding how Electron's IPC and HTTP responses work:

```javascript
// Readable stream — data arrives in chunks
const response = await fetch(url);
const reader = response.body.getReader();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  processChunk(value); // Uint8Array chunk
}
```

### Buffer vs ArrayBuffer vs Blob

| Type | Environment | Mutable | Use Case |
|------|-------------|---------|----------|
| **Buffer** | Node.js only | Yes | File I/O, IPC, network |
| **ArrayBuffer** | Browser + Node.js | No (use views) | Web APIs, typed arrays |
| **Blob** | Browser only | No | File-like objects, object URLs |
| **Uint8Array** | Both | Yes | View into ArrayBuffer |

---

## 🔗 DJ.ai Connection

- **`electron-app/electron/main.cjs`** — The `ai-tts-request` IPC handler fetches TTS audio from APIs, converts the response to a base64 string via `Buffer`, and returns it to the renderer; includes response size validation
- **`electron-app/src/services/OpenAITTSService.ts`** — `renderToBlob()` method generates audio and returns a `Blob` for pre-caching; `speakFromBlob()` plays pre-rendered blobs
- **`electron-app/src/services/ElevenLabsTTSService.ts`** — Same pattern: API response → `Blob` → `URL.createObjectURL` → `Audio.play()`
- **`electron-app/src/components/AudioVisualizer.tsx`** — Uses `Uint8Array` with Web Audio API's `AnalyserNode.getByteFrequencyData()` for real-time frequency visualization
- **`electron-app/src/App.tsx`** — `preGenCacheRef` stores pre-generated `Blob` objects for seamless track transitions

---

## 🎯 Key Takeaways

- **Buffer** (Node.js) and **Blob** (browser) are the primary binary data types in DJ.ai
- **Base64 encoding** is required for transferring binary data over IPC (JSON serialization)
- TTS audio flows: API → `Buffer` (main process) → base64 string → IPC → `Blob` (renderer) → `URL.createObjectURL` → `Audio` playback
- **Always call `URL.revokeObjectURL()`** after playback to prevent memory leaks
- `Uint8Array` is the bridge between `ArrayBuffer` and typed access — used for audio frequency data

---

## 📖 Resources

- [Buffer (Node.js)](https://nodejs.org/api/buffer.html) — Official Buffer documentation
- [ArrayBuffer (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) — ArrayBuffer reference
- [Blob (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Blob) — Blob API reference
- [Base64 encoding/decoding](https://developer.mozilla.org/en-US/docs/Glossary/Base64) — MDN guide to base64
- [Typed Arrays (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Typed_arrays) — Working with binary data views
