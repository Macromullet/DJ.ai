# Anthropic (Claude) API Integration

## Overview

Anthropic's Messages API provides access to Claude models for text generation. DJ.ai uses Claude as an alternative commentary provider, giving users a choice of AI personality and style.

## Key Differences from OpenAI

| Aspect | OpenAI | Anthropic |
|--------|--------|-----------|
| **Endpoint** | `/v1/chat/completions` | `/v1/messages` |
| **Auth header** | `Authorization: Bearer sk-...` | `x-api-key: sk-ant-...` |
| **System prompt** | In messages array (`role: "system"`) | Separate `system` field |
| **Token limit field** | `max_tokens` | `max_tokens` (required) |
| **Model naming** | `gpt-4o-mini` | `claude-sonnet-4-20250514` |

### The API Request

```javascript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',  // API version header required
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    system: 'You are an energetic radio DJ with deep music knowledge...',
    messages: [
      { role: 'user', content: 'Introduce: "Bohemian Rhapsody" by Queen' },
    ],
    max_tokens: 150,
    temperature: 0.8,
  }),
});
```

### Response Format

```json
{
  "content": [{
    "type": "text",
    "text": "Alright music lovers, get ready for a masterpiece..."
  }],
  "model": "claude-sonnet-4-20250514",
  "usage": {
    "input_tokens": 38,
    "output_tokens": 42
  }
}
```

Note: Anthropic returns `content` as an array of content blocks (not `choices`), and uses `input_tokens`/`output_tokens` (not `prompt_tokens`/`completion_tokens`).

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/AICommentaryService.ts` | Formats Anthropic-specific request structure (separate system prompt, different auth header) |
| `electron-app/electron/validation.cjs` | `isAllowedAIHost()` — allowlists `api.anthropic.com` |
| `electron-app/src/utils/validateApiKey.ts` | Validates Anthropic API key via test request |
| `electron-app/src/utils/secretStorage.ts` | Encrypts Anthropic API key at rest |

### Provider Selection

Users choose their preferred LLM provider in DJ.ai settings. The `AICommentaryService` adapts the request format based on the selected provider:

```typescript
// Simplified logic
switch (provider) {
  case 'openai':
    // Format for OpenAI Chat Completions API
    break;
  case 'anthropic':
    // Format for Anthropic Messages API
    // System prompt goes in separate field
    // Auth via x-api-key header
    break;
}
```

## Why Offer Multiple Providers?

| Reason | Details |
|--------|---------|
| **User choice** | Users may already have an API key for one provider |
| **Style differences** | Claude and GPT produce different commentary styles |
| **Resilience** | If one provider has an outage, users can switch |
| **Cost control** | Different providers have different pricing tiers |

## Key Takeaways

- Anthropic uses a `system` field (not a system message in the array)
- The `anthropic-version` header is required for all requests
- Auth uses `x-api-key` header (not `Authorization: Bearer`)
- Response format differs from OpenAI — `content` array with typed blocks
- DJ.ai abstracts provider differences behind `AICommentaryService`

## References

- [Anthropic Text Generation](https://docs.anthropic.com/en/docs/build-with-claude/text-generation)
- [Anthropic Messages API Reference](https://docs.anthropic.com/en/api/messages)
- [Anthropic API Versioning](https://docs.anthropic.com/en/api/versioning)
