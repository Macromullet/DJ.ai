# Audio Formats

## Why Audio Formats Matter

Different TTS providers return audio in different formats. The browser's `<audio>` element and `AudioContext` API each support different codecs. Understanding formats is essential for reliable playback across providers.

## Common Formats

### PCM (Pulse Code Modulation)

Raw, uncompressed audio samples. No header, no compression.

```
Properties:
  - Sample rate: 24000 Hz (Gemini) or 44100 Hz (CD quality)
  - Bit depth: 16-bit (2 bytes per sample)
  - Channels: 1 (mono) or 2 (stereo)
  - Size: sample_rate × channels × (bit_depth/8) × duration_seconds
  - 1 second of 24kHz mono 16-bit = 48,000 bytes

Browser support: ❌ Cannot play directly — needs WAV header or AudioContext decode
```

### WAV (Waveform Audio)

PCM with a 44-byte header describing the format. Uncompressed.

```
Structure:
  [RIFF header (12 bytes)] [fmt chunk (24 bytes)] [data chunk (8 bytes + PCM data)]

  RIFF....WAVE    ← File type identifier
  fmt ....        ← Sample rate, bit depth, channels
  data....        ← Raw PCM audio samples

Browser support: ✅ Universal (all browsers)
```

### MP3 (MPEG-1 Audio Layer III)

Lossy compression. ~10x smaller than WAV for equivalent quality.

```
Properties:
  - Bitrate: 128-320 kbps
  - ~1 second of speech ≈ 16-40 KB (vs 48-176 KB for WAV)
  
Browser support: ✅ Universal
Used by: OpenAI TTS (default), ElevenLabs
```

### Opus

Modern, open-source codec. Excellent quality at low bitrates.

```
Properties:
  - Bitrate: 6-510 kbps
  - Designed for speech and music
  - Better quality than MP3 at same bitrate

Browser support: ✅ All modern browsers (Chrome, Firefox, Edge, Safari 15+)
Used by: OpenAI TTS (optional format)
```

## DJ.ai Implementation

### Provider → Format Mapping

| Provider | Output Format | Handling |
|----------|--------------|----------|
| **OpenAI TTS** | MP3 (default) | Direct playback via `<audio>` or AudioContext |
| **ElevenLabs** | MP3 | Direct playback |
| **Gemini TTS** | Raw PCM (Base64 in JSON) | `pcmToWav()` conversion, then playback |
| **Web Speech** | OS audio output | No format handling needed (plays directly) |

### Gemini's PCM → WAV Conversion

The `GeminiTTSService` (`electron-app/src/services/GeminiTTSService.ts`) performs PCM-to-WAV conversion:

```javascript
// 1. Decode Base64 from Gemini response
const pcmBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

// 2. Build WAV header (44 bytes)
const wavHeader = buildWavHeader({
  sampleRate: 24000,     // From MIME type: audio/L16;rate=24000
  channels: 1,           // Mono
  bitsPerSample: 16,     // 16-bit
  dataLength: pcmBuffer.byteLength
});

// 3. Combine header + PCM data
const wavBlob = new Blob([wavHeader, pcmBuffer], { type: 'audio/wav' });

// 4. Play via Audio element or AudioContext
const url = URL.createObjectURL(wavBlob);
const audio = new Audio(url);
audio.play();
```

### MIME Type Detection

The `GeminiTTSService` reads the MIME type from the response to detect audio parameters, enabling correct WAV header construction. If the MIME type indicates an already-playable format, the conversion step is skipped.

### Response Size Validation

```javascript
// electron-app/electron/validation.cjs
const TTS_MAX_SIZE = 10 * 1024 * 1024;  // 10 MB

function isTTSResponseWithinLimit(size) {
  return size <= TTS_MAX_SIZE;
}
```

This prevents memory exhaustion from unexpectedly large audio responses.

## Key Takeaways

- PCM is raw audio — needs a WAV header or AudioContext for playback
- WAV = PCM + 44-byte header — universally supported by browsers
- MP3 is the most common TTS output format (OpenAI, ElevenLabs)
- Gemini returns PCM-in-JSON, requiring client-side WAV conversion
- Always validate response size to prevent OOM attacks

## References

- [MDN — Audio Codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs)
- [WAV Specification](https://www.mmsp.ece.mcgill.ca/Documents/AudioFormats/WAVE/WAVE.html)
- [MDN — Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
