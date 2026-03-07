# PCM to WAV Conversion

## The Concept

**PCM (Pulse-Code Modulation)** is raw, uncompressed audio data — just a stream of numbers representing amplitude samples. It has no metadata: no sample rate, no bit depth, no channel count. A player receiving raw PCM has no idea how to interpret it.

**WAV** is PCM data wrapped in a **44-byte header** that describes the audio format. The header tells the player everything it needs: sample rate, bit depth, number of channels, and data size.

```
WAV File Structure:
┌──────────────────────────────────┐
│ RIFF Header (12 bytes)           │  "RIFF" + file size + "WAVE"
├──────────────────────────────────┤
│ fmt  Subchunk (24 bytes)         │  Audio format, channels, sample rate,
│                                  │  byte rate, block align, bits per sample
├──────────────────────────────────┤
│ data Subchunk Header (8 bytes)   │  "data" + data size
├──────────────────────────────────┤
│ PCM Audio Data (variable)        │  Raw audio samples
└──────────────────────────────────┘
```

## How DJ.ai Converts PCM to WAV

The Gemini TTS API returns raw PCM audio (24kHz, 16-bit, mono). DJ.ai's `GeminiTTSService` adds a WAV header before playback:

```typescript
// Simplified from electron-app/src/services/GeminiTTSService.ts
private pcmToWav(pcmData: ArrayBuffer): Blob {
  const sampleRate = 24000;   // 24kHz (Gemini's output rate)
  const numChannels = 1;      // Mono
  const bitsPerSample = 16;   // 16-bit PCM

  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;

  // Create 44-byte WAV header
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);  // File size - 8
  writeString(view, 8, 'WAVE');

  // fmt subchunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);            // Subchunk size
  view.setUint16(20, 1, true);             // PCM format = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data subchunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Combine header + PCM data
  return new Blob([header, pcmData], { type: 'audio/wav' });
}
```

### The Magic Numbers

| Offset | Bytes | Value | Meaning |
|--------|-------|-------|---------|
| 0 | 4 | "RIFF" | File type identifier |
| 4 | 4 | file size - 8 | Remaining file size |
| 8 | 4 | "WAVE" | File format |
| 20 | 2 | 1 | PCM format (uncompressed) |
| 22 | 2 | 1 | Mono channel |
| 24 | 4 | 24000 | Sample rate (Hz) |
| 34 | 2 | 16 | Bits per sample |

## DJ.ai Connection

`GeminiTTSService.pcmToWav()` in `electron-app/src/services/` is called every time Gemini generates speech audio. The resulting Blob is converted to a Blob URL and played through an HTML5 Audio element. Understanding this conversion is essential for debugging audio issues — wrong sample rate, bit depth, or byte order produces static or silence.

## Key Takeaways

- PCM is raw audio data with no format information
- WAV adds a 44-byte header describing sample rate, bit depth, and channels
- Little-endian byte order (`true` in `setUint32`) is standard for WAV
- Mismatched parameters (e.g., wrong sample rate) produce distorted or silent audio

## Further Reading

- [WAV File Format Specification](http://soundfile.sapp.org/doc/WaveFormat/)
- [MDN: Audio Codecs](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs)
- [MDN: DataView](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)
