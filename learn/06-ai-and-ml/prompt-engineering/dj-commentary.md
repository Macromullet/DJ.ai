# DJ Commentary Prompt Design

## The System Prompt

The system prompt is the most important part of DJ.ai's commentary generation. It defines **who** the AI is, **what** it should produce, and **how** it should behave. This prompt is sent with every request and shapes all output.

### Anatomy of DJ.ai's System Prompt

```
┌─────────────────────────────────────────┐
│ 1. PERSONA                              │
│    "You are an energetic radio DJ..."   │
│                                         │
│ 2. OUTPUT FORMAT                        │
│    "Generate 2-3 sentences..."          │
│                                         │
│ 3. STYLE GUIDELINES                     │
│    "Warm, enthusiastic, conversational" │
│                                         │
│ 4. CONSTRAINTS                          │
│    "Do not use explicit language"       │
│    "Do not make up facts about songs"   │
│                                         │
│ 5. CONTEXT USAGE                        │
│    "Reference the artist, album, and    │
│     previous track when available"      │
└─────────────────────────────────────────┘
```

## The User Message Template

Each commentary request includes context about the current track:

```typescript
// Simplified from AICommentaryService.ts
const userMessage = `Introduce the following track:
- Title: "${track.title}"
- Artist: "${track.artist}"
- Album: "${track.album}"
${previousTrack ? `- Previous track: "${previousTrack.title}" by ${previousTrack.artist}` : ''}`;
```

### Why Include Previous Track?

The previous track enables **transitions** — the most DJ-like behavior:

```
Without context: "Here's Bohemian Rhapsody by Queen!"
With context:    "From Zeppelin to Queen — we're keeping the classic rock rolling! 
                  Here comes Bohemian Rhapsody!"
```

## DJ.ai Source Files

| File | Role |
|------|------|
| `electron-app/src/services/AICommentaryService.ts` | System prompt, user message formatting, provider-specific request building |
| `electron-app/src/types/IAICommentaryService.ts` | Interface: `generateCommentary()`, `getCommentaryForTrack()` |
| `electron-app/src/test-fixtures/MockAICommentaryService.ts` | Mock for testing without API calls |

### Response Caching

The `AICommentaryService` caches generated commentary to avoid redundant API calls:

```typescript
// Simplified caching logic
const cacheKey = `${track.title}-${track.artist}`;
if (this.cache.has(cacheKey)) {
  return this.cache.get(cacheKey);
}
const commentary = await this.callLLM(track);
this.cache.set(cacheKey, commentary);
return commentary;
```

### Fallback Commentary

If the API call fails (network error, rate limit, invalid key), the service returns generic commentary rather than showing an error:

```typescript
// Fallback when API is unavailable
return `Now playing: "${track.title}" by ${track.artist}`;
```

## Prompt Design Lessons

| Lesson | Why |
|--------|-----|
| **Keep system prompts concise** | Saves tokens = saves money on every request |
| **Be explicit about length** | "2-3 sentences" prevents 200-word essays |
| **Forbid fabrication** | LLMs will make up "fun facts" — constrain this |
| **Include transition context** | Previous track makes commentary more natural |
| **Test with diverse tracks** | Ensure prompts work for classical, hip-hop, electronic, etc. |

## Key Takeaways

- The system prompt defines the DJ persona and output constraints
- Include track metadata (title, artist, album) and previous track for rich context
- Cache responses to avoid duplicate API calls
- Always provide fallback commentary for API failures
- Test prompts across diverse music genres to ensure quality

## References

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic System Prompts](https://docs.anthropic.com/en/docs/build-with-claude/system-prompts)
