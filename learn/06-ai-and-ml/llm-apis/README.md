# LLM API Integration

## What Are LLM APIs?

Large Language Model APIs provide access to AI models that can generate human-like text. Instead of running massive models locally, you send a prompt to a cloud API and receive a generated response. The three major providers are OpenAI (GPT), Anthropic (Claude), and Google (Gemini).

## Common API Pattern

All three providers follow a similar request/response pattern:

```json
// Request
POST /v1/chat/completions
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "You are a radio DJ..." },
    { "role": "user", "content": "Introduce: Bohemian Rhapsody by Queen" }
  ],
  "temperature": 0.8,
  "max_tokens": 150
}

// Response
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Oh, here we go! The legendary Queen with Bohemian Rhapsody..."
    }
  }],
  "usage": { "prompt_tokens": 42, "completion_tokens": 35, "total_tokens": 77 }
}
```

## Topics in This Section

| File | Provider | DJ.ai Use |
|------|----------|-----------|
| [openai.md](openai.md) | OpenAI (GPT-4o Mini) | Primary commentary provider |
| [anthropic.md](anthropic.md) | Anthropic (Claude Sonnet) | Alternative commentary provider |
| [gemini.md](gemini.md) | Google (Gemini Flash) | TTS and multimodal capabilities |
| [api-key-management.md](api-key-management.md) | All providers | Securing and rotating API keys |

## DJ.ai Connection

DJ.ai's `AICommentaryService` (`electron-app/src/services/AICommentaryService.ts`) abstracts over multiple LLM providers. Users choose their preferred provider in settings, and the service formats the appropriate API request:

- All requests go through the Electron IPC proxy (`electron-app/electron/main.cjs`)
- API keys are stored encrypted via safeStorage (`electron-app/src/utils/secretStorage.ts`)
- Responses are cached to avoid duplicate API calls for the same track

## Key Takeaways

- LLM APIs share a common chat completions pattern: system prompt + user messages → generated text
- DJ.ai supports multiple providers for user choice and resilience
- All API calls are proxied through the Electron main process (CORS bypass + validation)
- Token usage determines cost — shorter prompts and responses save money

## References

- [OpenAI Chat Completions](https://platform.openai.com/docs/guides/text-generation)
- [Anthropic Messages API](https://docs.anthropic.com/en/docs/build-with-claude/text-generation)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
