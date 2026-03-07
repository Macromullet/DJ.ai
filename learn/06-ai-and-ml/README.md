# 06 — AI and Machine Learning

## How DJ.ai Uses AI

DJ.ai integrates multiple AI services to create an intelligent DJ experience. AI powers two core features:

1. **DJ Commentary** — Large Language Models generate contextual, personality-driven introductions for each track
2. **Text-to-Speech** — Multiple TTS providers voice the commentary with different styles and qualities

All AI services run **client-side** in the Electron app. API calls go through the main process IPC proxy to bypass browser CORS restrictions, with API keys stored securely via Electron's safeStorage.

## Learning Path

| # | Topic | What You'll Learn |
|---|-------|-------------------|
| 1 | [LLM APIs](llm-apis/) | OpenAI, Anthropic, and Gemini integration |
| 2 | [Text-to-Speech](text-to-speech/) | Multi-provider TTS architecture |
| 3 | [Prompt Engineering](prompt-engineering/) | Crafting DJ commentary prompts |
| 4 | [CORS Bypass](cors-bypass/) | Why Electron needs an IPC proxy for API calls |

## Architecture Overview

```
┌────────────────────────────────────────────────┐
│  Renderer Process                              │
│  ┌─────────────────┐  ┌────────────────────┐   │
│  │ AICommentary    │  │ TTSService         │   │
│  │ Service         │  │ (OpenAI/ElevenLabs/│   │
│  │ (generates text)│  │  Gemini/WebSpeech) │   │
│  └────────┬────────┘  └────────┬───────────┘   │
│           │ IPC                 │ IPC            │
├───────────┼─────────────────────┼────────────────┤
│  Main Process                                   │
│  ┌────────┴─────────────────────┴──────────┐    │
│  │  AI API Proxy (validation + fetch)      │    │
│  │  - URL allowlist validation             │    │
│  │  - Request forwarding                   │    │
│  │  - Binary audio response handling       │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
         │                    │
    ┌────┴────┐          ┌───┴────┐
    │ OpenAI  │          │ Eleven │
    │ Anthro. │          │ Labs   │
    │ Gemini  │          │ etc.   │
    └─────────┘          └────────┘
```

## DJ.ai Source Files

| File | Purpose |
|------|---------|
| `electron-app/src/services/AICommentaryService.ts` | LLM-based DJ commentary generation |
| `electron-app/src/services/OpenAITTSService.ts` | OpenAI TTS integration |
| `electron-app/src/services/ElevenLabsTTSService.ts` | ElevenLabs TTS with 15+ voices |
| `electron-app/src/services/GeminiTTSService.ts` | Gemini audio generation |
| `electron-app/src/services/WebSpeechTTSService.ts` | Browser-native TTS fallback |
| `electron-app/src/types/ITTSService.ts` | TTS provider interface |
| `electron-app/src/types/IAICommentaryService.ts` | Commentary service interface |
| `electron-app/electron/main.cjs` | IPC proxy for AI API requests |
| `electron-app/src/utils/secretStorage.ts` | API key encryption via safeStorage |

## Key Takeaways

- AI services are **client-side** — no backend needed for commentary or TTS
- Multiple providers per feature (3 LLMs, 4 TTS) give users flexibility and fallback options
- The IPC proxy in the main process handles CORS bypass and URL validation
- API keys are encrypted at rest with Electron safeStorage

## References

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [Google AI Docs](https://ai.google.dev/docs)
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
