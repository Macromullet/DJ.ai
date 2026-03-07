# Gemini TTS

## Overview

Google's Gemini API can generate spoken audio by including audio output configuration in the `generateContent` request. Unlike dedicated TTS APIs (OpenAI, ElevenLabs) that return binary audio streams, Gemini returns audio data as **Base64-encoded PCM embedded in a JSON response**.

## How It Works

### The API Request

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: 'Say this in an energetic DJ voice: Next up, a classic!' }]
      }],
      generationConfig: {
        responseModalities: ['AUDIO'],  // Request audio output
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore'  // Select voice
            }
          }
        }
      }
    })
  }
);
```

### The Response

```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "audio/L16;rate=24000",
          "data": "AAAA//8AAAEAAP..."
        }
      }]
    }
  }]
}
```

**Key difference**: The audio is raw PCM at 24kHz, 16-bit, mono — encoded as Base64 inside the JSON. The browser's `<audio>` element can't play raw PCM directly, so DJ.ai must convert it to WAV first.

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/GeminiTTSService.ts` | Gemini TTS with PCM→WAV conversion |

### PCM to WAV Conversion

The `GeminiTTSService` includes a `pcmToWav()` function that wraps raw PCM data in a WAV header:

```javascript
// Simplified from GeminiTTSService.ts
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // WAV header is 44 bytes
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.byteLength, true);  // File size
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);           // Subchunk size
  view.setUint16(20, 1, true);            // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.byteLength, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
}
```

### MIME Type Detection

The service reads the `mimeType` from Gemini's response to determine audio parameters:
- `audio/L16;rate=24000` → 24kHz, 16-bit linear PCM
- The MIME type also informs whether the audio needs conversion or can be played directly

## Key Takeaways

- Gemini returns audio as Base64 PCM inside JSON (not a binary stream)
- Raw PCM must be converted to WAV for browser playback
- WAV conversion requires building a 44-byte header with sample rate, bit depth, and channel info
- `gemini-2.0-flash` provides cost-effective TTS as part of the multimodal API
- The MIME type in the response tells you the audio encoding parameters

## References

- [Gemini Audio Generation](https://ai.google.dev/gemini-api/docs/audio)
- [Gemini API — generateContent](https://ai.google.dev/api/generate-content)
- [WAV File Format (Wikipedia)](https://en.wikipedia.org/wiki/WAV)
