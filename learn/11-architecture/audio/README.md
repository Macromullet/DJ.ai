# Audio Engineering

## The Concept

DJ.ai works extensively with audio — from Text-to-Speech commentary to music playback to future audio visualization. Understanding audio fundamentals is essential for working with the codebase.

### Key Audio Concepts

| Concept | Description |
|---------|-------------|
| **PCM** | Raw audio samples — uncompressed, unformatted |
| **WAV** | PCM data wrapped with a header (sample rate, bit depth, channels) |
| **Sample Rate** | Samples per second (44100 Hz = CD quality, 24000 Hz = speech) |
| **Bit Depth** | Bits per sample (16-bit = 65,536 levels, standard quality) |
| **Channels** | Mono (1) or Stereo (2) |
| **Blob URL** | Browser URL pointing to in-memory binary data |
| **AudioContext** | Web Audio API interface for processing and playing audio |

## Audio in DJ.ai

DJ.ai deals with audio in three areas:

1. **TTS Playback** — AI-generated speech (Gemini, Edge TTS) delivered as PCM/MP3
2. **Music Playback** — Spotify/Apple Music streams via HTML5 Audio or embedded players
3. **Audio Visualization** — (Planned future feature) Frequency analysis driving GPU visuals

## Learning Path

| File | Topic |
|------|-------|
| [pcm-wav-conversion.md](./pcm-wav-conversion.md) | Converting raw PCM to playable WAV |
| [blob-url-management.md](./blob-url-management.md) | Preventing memory leaks from Blob URLs |
| [audio-playback-patterns.md](./audio-playback-patterns.md) | HTML5 Audio and AudioContext |

## Key Takeaways

- TTS APIs often return raw PCM — you must add a WAV header before playback
- Blob URLs leak memory if not explicitly revoked
- The Audio element is simplest; AudioContext is the fallback for browser restrictions
- Sample rate must match between generation and playback (24kHz for speech is common)

## Further Reading

- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: Audio and Video Delivery](https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery)
