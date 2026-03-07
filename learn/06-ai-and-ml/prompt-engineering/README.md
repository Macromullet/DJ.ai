# Prompt Engineering

## What Is Prompt Engineering?

Prompt engineering is the practice of crafting inputs to LLMs to get reliable, high-quality outputs. It's part art, part science — small changes to a prompt can dramatically change the model's response.

For DJ.ai, prompt engineering determines the **personality, style, and quality** of DJ commentary. A well-crafted prompt produces energetic, contextual track introductions. A poor prompt produces generic, repetitive filler.

## Key Principles

### 1. Be Specific

```
❌ "Introduce this song."
✅ "Generate a 2-3 sentence DJ radio introduction for the song. Include the artist name and a fun fact or observation about the track."
```

### 2. Define the Persona

```
❌ "You are helpful."
✅ "You are an energetic late-night radio DJ with deep knowledge of music history. Your style is warm, enthusiastic, and conversational — like talking to a friend about their new favorite song."
```

### 3. Constrain the Output

```
❌ "Tell me about this song." (could produce 500 words)
✅ "In exactly 2-3 sentences, introduce this track. Keep it under 50 words."
```

### 4. Provide Context

```
❌ "Introduce: Bohemian Rhapsody"
✅ "Introduce: 'Bohemian Rhapsody' by Queen from the album 'A Night at the Opera' (1975). The previous track was 'Stairway to Heaven' by Led Zeppelin."
```

## Topics in This Section

| File | Concept |
|------|---------|
| [dj-commentary.md](dj-commentary.md) | DJ.ai's system prompt and commentary generation |
| [temperature-and-sampling.md](temperature-and-sampling.md) | Temperature, top_p, and other generation parameters |

## DJ.ai Connection

The `AICommentaryService` (`electron-app/src/services/AICommentaryService.ts`) implements these principles:

- **System prompt**: Defines the DJ persona, output constraints, and style guidelines
- **User message**: Includes track name, artist, album, and previous track for context
- **Response caching**: Avoids regenerating commentary for the same track
- **Fallback**: Returns a generic "Now playing..." if the API call fails

## Key Takeaways

- Good prompts are specific, constrained, and context-rich
- Define a clear persona in the system prompt for consistent output
- Always constrain output length to control cost and relevance
- Provide context (previous track, album) for more interesting commentary
- Cache responses — same input produces varied but consistent output

## References

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Engineering](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering)
- [Google Prompt Engineering](https://ai.google.dev/gemini-api/docs/prompting-strategies)
