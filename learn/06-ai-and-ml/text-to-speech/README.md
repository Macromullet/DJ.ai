# Text-to-Speech (TTS)

## What Is TTS?

Text-to-Speech converts written text into spoken audio. Modern TTS systems use neural networks to produce natural-sounding speech with appropriate intonation, pacing, and emotion — far beyond the robotic voices of earlier systems.

## DJ.ai's Multi-Provider Architecture

DJ.ai supports **four TTS providers**, each with different strengths:

| Provider | Quality | Cost | Latency | DJ.ai Service |
|----------|---------|------|---------|---------------|
| [OpenAI TTS](openai-tts.md) | High | $15/1M chars | Medium | `OpenAITTSService.ts` |
| [ElevenLabs](elevenlabs.md) | Excellent | $5-330/mo | Low | `ElevenLabsTTSService.ts` |
| [Gemini TTS](gemini-tts.md) | Good | Low | Medium | `GeminiTTSService.ts` |
| [Web Speech](web-speech-api.md) | Basic | Free | Instant | `WebSpeechTTSService.ts` |

### The ITTSService Interface

All providers implement a common interface:

```typescript
// electron-app/src/types/ITTSService.ts
interface ITTSService {
  speak(text: string): Promise<void>;           // Generate + play audio
  renderToBlob(text: string): Promise<Blob>;    // Generate audio as blob
  speakFromBlob(blob: Blob): Promise<void>;     // Play a pre-rendered blob
  stop(): void;                                  // Stop playback
  setVoice(voice: string): void;                // Select voice
  setRate(rate: number): void;                  // Adjust speed
  setPitch(pitch: number): void;                // Adjust pitch
  getVoices(): Promise<string[]>;               // List available voices
}
```

This interface enables:
- **Provider swapping** — users change TTS provider without code changes
- **Pre-rendering** — generate audio blobs ahead of time for gapless playback
- **Consistent controls** — same voice/rate/pitch API across all providers

## Also in This Section

| File | Topic |
|------|-------|
| [audio-formats.md](audio-formats.md) | PCM, WAV, MP3, Opus — encoding and conversion |

## DJ.ai Source Files

| File | Role |
|------|------|
| `electron-app/src/types/ITTSService.ts` | Common TTS interface |
| `electron-app/src/services/OpenAITTSService.ts` | OpenAI TTS (tts-1 model) |
| `electron-app/src/services/ElevenLabsTTSService.ts` | ElevenLabs with 15+ voices |
| `electron-app/src/services/GeminiTTSService.ts` | Gemini audio generation |
| `electron-app/src/services/WebSpeechTTSService.ts` | Browser-native fallback |
| `electron-app/electron/main.cjs` | IPC proxy for TTS API calls (binary audio responses) |

## Key Takeaways

- DJ.ai offers four TTS providers: OpenAI, ElevenLabs, Gemini, and Web Speech API
- All providers implement `ITTSService` for consistent API surface
- Web Speech API is the zero-cost fallback (no API key needed)
- TTS requests go through the IPC proxy for CORS bypass and URL validation
- Pre-rendering (`renderToBlob`) enables gapless DJ commentary playback

## References

- [OpenAI TTS Guide](https://platform.openai.com/docs/guides/text-to-speech)
- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
