# OpenAI Text-to-Speech

## Overview

OpenAI's TTS API converts text into lifelike spoken audio. It offers two model variants and six voices, with control over speed and output format.

## API Details

### Models

| Model | Quality | Latency | Cost | DJ.ai Use |
|-------|---------|---------|------|-----------|
| `tts-1` | Good | Low | $15/1M chars | ✅ Default (optimized for real-time) |
| `tts-1-hd` | Higher | Higher | $30/1M chars | Available for higher quality |

### Voices

| Voice | Character |
|-------|-----------|
| `alloy` | Neutral, balanced |
| `echo` | Warm, conversational |
| `fable` | Expressive, animated |
| `onyx` | Deep, authoritative |
| `nova` | Friendly, upbeat |
| `shimmer` | Soft, gentle |

### The API Request

```javascript
// Simplified from OpenAITTSService.ts
const response = await fetch('https://api.openai.com/v1/audio/speech', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'tts-1',
    input: 'Welcome back music lovers! Next up, a classic...',
    voice: 'nova',
    speed: 1.0,              // 0.25 to 4.0
    response_format: 'mp3',  // mp3, opus, aac, flac, wav, pcm
  }),
});

// Response is binary audio data (not JSON)
const audioBlob = await response.blob();
```

**Key difference from chat completions**: The TTS endpoint returns **binary audio data**, not JSON. This requires special handling in the IPC proxy.

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/OpenAITTSService.ts` | Full TTS implementation with voice selection, speed control, dual playback modes |
| `electron-app/electron/main.cjs` | `ai-tts-request` IPC handler — returns Base64-encoded audio to renderer |

### Features

- **Voice selection**: All 6 OpenAI voices available
- **Speed control**: Adjustable 0.25x to 4.0x
- **Request deduplication**: Won't send the same text twice while a request is in flight
- **Dual playback**: Supports both Audio element and AudioContext playback
- **Pre-rendering**: `renderToBlob()` generates audio ahead of playback for gapless DJ commentary

### IPC Proxy Handling

TTS responses are binary audio, not JSON. The IPC proxy in `main.cjs` handles this differently from text API calls:

```javascript
// electron-app/electron/main.cjs — TTS request handler
// 1. Validate URL against allowlist (isAllowedAIHost)
// 2. Fetch the TTS API
// 3. Get response as ArrayBuffer
// 4. Check size limit (10 MB max)
// 5. Convert to Base64 string
// 6. Return to renderer via IPC
```

The 10 MB size limit (`isTTSResponseWithinLimit()` in `validation.cjs`) prevents memory exhaustion from malicious or malformed responses.

## Key Takeaways

- `tts-1` is optimized for real-time, low-latency speech generation
- Response is binary audio (not JSON) — requires special IPC handling
- Six voices with distinct personalities suit different DJ styles
- Speed control (0.25x-4.0x) lets users adjust commentary pacing
- Always set a response size limit to prevent OOM attacks

## References

- [OpenAI TTS Guide](https://platform.openai.com/docs/guides/text-to-speech)
- [OpenAI Audio API Reference](https://platform.openai.com/docs/api-reference/audio/createSpeech)
