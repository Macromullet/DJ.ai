# Google Gemini API Integration

## Overview

Google's Gemini API provides access to multimodal AI models capable of text generation, image understanding, and — importantly for DJ.ai — **audio generation**. While OpenAI and Anthropic handle text commentary, Gemini uniquely serves as both a text and TTS provider.

## Key Concepts

### Models

| Model | Strengths | DJ.ai Use |
|-------|-----------|-----------|
| `gemini-2.0-flash` | Fast, multimodal, cost-effective | ✅ TTS audio generation |
| `gemini-1.5-pro` | Long context, reasoning | Available for commentary |
| `gemini-1.5-flash` | Lightweight, fast | Alternative option |

### The generateContent API

```javascript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: 'Introduce: "Bohemian Rhapsody" by Queen' }]
      }],
      systemInstruction: {
        parts: [{ text: 'You are an energetic radio DJ...' }]
      },
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 150,
      }
    })
  }
);
```

### Multimodal Capabilities

Gemini's unique strength is multimodal input/output. For DJ.ai, the critical capability is **audio output** — Gemini can return generated speech as PCM audio data directly in the JSON response:

```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "inlineData": {
          "mimeType": "audio/L16;rate=24000",
          "data": "base64-encoded-pcm-audio..."
        }
      }]
    }
  }]
}
```

This is fundamentally different from dedicated TTS APIs (OpenAI, ElevenLabs) which return audio as a binary stream. Gemini returns audio **embedded in the JSON response**, requiring different parsing logic.

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/GeminiTTSService.ts` | Gemini audio generation, PCM-to-WAV conversion |
| `electron-app/src/services/AICommentaryService.ts` | Can use Gemini for text commentary |
| `electron-app/electron/validation.cjs` | Allowlists `generativelanguage.googleapis.com` |

### Gemini as TTS Provider

The `GeminiTTSService` sends text to Gemini and receives PCM audio data. Since browsers can't play raw PCM, it converts to WAV format before playback (see [audio-formats.md](../text-to-speech/audio-formats.md)).

## Key Takeaways

- Gemini is **multimodal** — it handles text, images, and audio in a single API
- Audio output is embedded as Base64 in the JSON response (not a binary stream)
- API key goes in the URL query parameter (different from OpenAI/Anthropic header auth)
- `gemini-2.0-flash` provides fast, cost-effective TTS with natural-sounding speech
- Gemini's `generateContent` format differs from OpenAI's `chat/completions`

## References

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Text Generation](https://ai.google.dev/gemini-api/docs/text-generation)
- [Gemini Audio Output](https://ai.google.dev/gemini-api/docs/audio)
