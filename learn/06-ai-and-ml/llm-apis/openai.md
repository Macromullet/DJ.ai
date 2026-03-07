# OpenAI API Integration

## Overview

OpenAI's Chat Completions API powers DJ.ai's primary commentary generation. The API accepts a conversation history (system + user messages) and returns a model-generated response.

## Key Concepts

### Models

| Model | Speed | Cost | DJ.ai Use |
|-------|-------|------|-----------|
| `gpt-4o-mini` | Fast | Low | ✅ Default for DJ commentary |
| `gpt-4o` | Medium | Medium | Available as upgrade |
| `gpt-4-turbo` | Slower | Higher | Not used (overkill for short commentary) |

### Tokens

Tokens are the unit of billing and context. Roughly:
- 1 token ≈ 4 characters in English
- 1 token ≈ ¾ of a word
- "Bohemian Rhapsody" ≈ 4 tokens

```
Prompt tokens:     What you send (system prompt + track info)     → You pay for these
Completion tokens: What the model generates (DJ commentary)       → You pay for these
Total cost:        (prompt_tokens × input_price) + (completion_tokens × output_price)
```

### The API Request

```javascript
// Simplified from AICommentaryService.ts
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an energetic radio DJ...' },
      { role: 'user', content: 'Introduce: "Bohemian Rhapsody" by Queen from "A Night at the Opera"' },
    ],
    temperature: 0.8,    // Creativity level (0=deterministic, 2=chaotic)
    max_tokens: 150,     // Cap response length
  }),
});
```

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/AICommentaryService.ts` | Formats OpenAI chat completion requests with DJ persona |
| `electron-app/electron/main.cjs` | IPC proxy — validates URL is `api.openai.com`, forwards request |
| `electron-app/src/utils/secretStorage.ts` | Encrypts/decrypts OpenAI API key via safeStorage |
| `electron-app/src/utils/validateApiKey.ts` | Validates API key by making a test request through IPC proxy |
| `electron-app/electron/validation.cjs` | `isAllowedAIHost()` — allowlists `api.openai.com` |

### Request Flow

```
1. User plays a track
2. AICommentaryService builds prompt with track name, artist, album
3. Calls window.electron.aiProxy.request({ url, method, headers, body })
4. IPC proxy validates URL against allowlist
5. Main process fetches api.openai.com
6. Response returned to renderer
7. Commentary cached for this track
```

## Key Takeaways

- `gpt-4o-mini` offers the best speed/cost ratio for short text generation
- Always set `max_tokens` to cap response length and cost
- Use `temperature` 0.7-0.9 for creative but coherent DJ commentary
- API key goes in the `Authorization: Bearer` header — never in the URL
- Token count determines cost — keep system prompts concise

## References

- [OpenAI Text Generation Guide](https://platform.openai.com/docs/guides/text-generation)
- [OpenAI Chat API Reference](https://platform.openai.com/docs/api-reference/chat)
- [OpenAI Pricing](https://openai.com/pricing)
