# ElevenLabs TTS

## Overview

ElevenLabs specializes in high-fidelity, expressive text-to-speech. It's known for natural-sounding voices with emotional range, making it an excellent fit for DJ commentary that needs personality and energy.

## Key Features

- **15+ preset voices** with distinct personalities
- **Voice cloning** — create custom voices from audio samples
- **Stability/Similarity controls** — fine-tune output consistency
- **Low latency** — streaming audio for real-time applications
- **Multiple output formats** — MP3, PCM, μ-law

## API Details

### The API Request

```javascript
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text: 'Oh yeah, get ready for this next track...',
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,           // 0=variable, 1=consistent
        similarity_boost: 0.75,   // 0=diverse, 1=close to original
      },
    }),
  }
);

// Response is binary audio (MP3 by default)
const audioBlob = await response.blob();
```

### Voice Settings

| Setting | Range | Effect |
|---------|-------|--------|
| `stability` | 0.0 - 1.0 | Low = more expressive/variable, High = more consistent |
| `similarity_boost` | 0.0 - 1.0 | How closely output matches the original voice |

**For DJ commentary**: Lower stability (0.3-0.5) creates more expressive, energetic speech. Higher similarity boost (0.7-0.8) keeps the voice recognizable.

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/ElevenLabsTTSService.ts` | Full ElevenLabs integration with 15+ named voice presets |
| `electron-app/electron/validation.cjs` | Allowlists `api.elevenlabs.io` |
| `electron-app/electron/main.cjs` | Binary audio response handling via `ai-tts-request` IPC |

### Voice Presets

The `ElevenLabsTTSService` includes named voice presets mapped to ElevenLabs voice IDs:

```typescript
// Simplified voice mapping
const VOICES = {
  'Rachel': 'voice-id-1',    // Calm, professional
  'Drew': 'voice-id-2',      // Warm, engaging
  'Clyde': 'voice-id-3',     // Deep, authoritative
  'Paul': 'voice-id-4',      // Energetic, youthful
  // ... 15+ voices total
};
```

Users select their preferred DJ voice in settings. The service maps the friendly name to the ElevenLabs voice ID for API requests.

### Dual Playback Modes

Like the OpenAI TTS service, ElevenLabs supports:
1. **Audio element playback** — simple, works everywhere
2. **AudioContext playback** — finer control for gapless transitions

## Cost Considerations

| Plan | Characters/month | Price |
|------|-------------------|-------|
| Free | 10,000 | $0 |
| Starter | 30,000 | $5/mo |
| Creator | 100,000 | $22/mo |
| Pro | 500,000 | $99/mo |

DJ commentary is typically 50-150 characters per track. At ~50 tracks per session, that's 2,500-7,500 characters — well within the free tier for casual use.

## Key Takeaways

- ElevenLabs produces the most natural, expressive TTS voices
- Stability and similarity boost controls let you tune expressiveness
- 15+ voice presets give users personality options for their DJ
- Auth uses `xi-api-key` header (different from OpenAI/Anthropic patterns)
- Free tier is sufficient for casual DJ use (~10K chars/month)

## References

- [ElevenLabs API Reference](https://elevenlabs.io/docs/api-reference/text-to-speech)
- [ElevenLabs Voice Settings](https://elevenlabs.io/docs/speech-synthesis/voice-settings)
- [ElevenLabs Pricing](https://elevenlabs.io/pricing)
