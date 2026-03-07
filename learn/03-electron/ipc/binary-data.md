# Transferring Binary Data over IPC

## The Challenge

IPC in Electron serializes data using the **structured clone algorithm** — the same mechanism `postMessage` uses in web workers. While this handles most data types efficiently, large binary payloads (audio files, images) require careful handling to avoid performance issues.

Common approaches:
1. **Base64 encoding** — convert binary to a string (simple, ~33% size overhead)
2. **ArrayBuffer transfer** — zero-copy transfer for large data
3. **MessagePorts** — persistent bidirectional channels for streaming

## Base64 Encoding (DJ.ai's Approach)

For moderate-sized binary data (under a few MB), base64 encoding is the simplest approach:

```javascript
// main.cjs — TTS audio fetch
ipcMain.handle('ai-tts-request', async (event, options) => {
  const response = await net.fetch(options.url, {
    method: options.method || 'POST',
    headers: options.headers,
    body: options.body
  });

  // Read binary audio data
  const buffer = await response.arrayBuffer();

  // Convert to base64 for IPC transfer
  return {
    data: Buffer.from(buffer).toString('base64'),
    contentType: response.headers.get('content-type'),
    status: response.status
  };
});
```

In the renderer, the base64 data is decoded back to binary for audio playback:

```typescript
// React component
const result = await window.electron.aiProxy.ttsRequest({
  url: 'https://api.openai.com/v1/audio/speech',
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ input: text, voice: 'alloy' })
});

// Decode base64 to audio blob
const audioBytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
const blob = new Blob([audioBytes], { type: result.contentType });
const audioUrl = URL.createObjectURL(blob);
const audio = new Audio(audioUrl);
audio.play();
```

## MessagePorts (For Streaming)

For larger data or continuous streams, Electron supports `MessagePort` — similar to web worker communication:

```javascript
// Main process creates a channel
const { port1, port2 } = new MessageChannelMain();

// Send port2 to the renderer
mainWindow.webContents.postMessage('new-channel', null, [port2]);

// Use port1 in main process for bidirectional communication
port1.on('message', (event) => { /* handle data */ });
port1.postMessage(largeBuffer);  // Efficient binary transfer
```

## Key Links

- [MessagePorts in Electron](https://www.electronjs.org/docs/latest/tutorial/message-ports)
- [Structured Clone Algorithm (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [MessageChannelMain API](https://www.electronjs.org/docs/latest/api/message-channel-main)

## Key Takeaways

- IPC uses **structured cloning** — most types transfer efficiently
- **Base64 encoding** is simple for small-to-medium binary data (~33% overhead)
- **MessagePorts** provide zero-copy transfer for large or streaming data
- Always consider **payload size** — very large transfers can block the IPC channel

## DJ.ai Connection

DJ.ai uses base64 encoding for TTS audio transfer via the `ai-tts-request` IPC channel in `electron-app/electron/main.cjs`. The main process fetches audio from AI providers (OpenAI, ElevenLabs), converts the response `ArrayBuffer` to a base64 string, and sends it through IPC. The renderer decodes it back to binary for playback. This approach works well because TTS clips are typically small (a few hundred KB). The main process also enforces a size limit on responses to prevent memory issues from unexpectedly large payloads.
