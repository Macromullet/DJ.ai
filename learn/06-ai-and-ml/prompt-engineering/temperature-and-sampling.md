# Temperature and Sampling Parameters

## What Is Temperature?

Temperature controls the **randomness** of LLM output. It adjusts the probability distribution over possible next tokens:

```
Temperature 0.0:  Always picks the most likely token     → Deterministic, repetitive
Temperature 0.5:  Moderate randomness                    → Balanced creativity
Temperature 1.0:  Standard distribution                  → Natural language variety
Temperature 2.0:  Flattened distribution                 → Chaotic, unpredictable
```

### Intuition

Imagine the model choosing between "amazing," "great," and "wonderful":

```
Temperature 0.0:  [amazing: 100%, great: 0%, wonderful: 0%]  → Always "amazing"
Temperature 0.7:  [amazing: 60%, great: 25%, wonderful: 15%] → Usually "amazing," sometimes varies
Temperature 1.5:  [amazing: 40%, great: 35%, wonderful: 25%] → Anything goes
```

## Key Sampling Parameters

### `temperature` (0.0 - 2.0)

Controls overall randomness. This is the most commonly tuned parameter.

| Value | Behavior | Best For |
|-------|----------|----------|
| 0.0 | Deterministic | Code generation, factual Q&A |
| 0.3-0.5 | Low creativity | Summarization, translation |
| 0.7-0.9 | Moderate creativity | ✅ **DJ commentary** |
| 1.0-1.5 | High creativity | Poetry, brainstorming |
| 1.5-2.0 | Chaotic | Experimental, usually too random |

### `top_p` (0.0 - 1.0) — Nucleus Sampling

Instead of temperature, you can control randomness by limiting the **pool of candidate tokens**:

```
top_p = 0.9:  Consider only tokens whose cumulative probability ≤ 90%
              Cuts off the long tail of unlikely tokens

top_p = 0.1:  Consider only the very most likely tokens
              Very focused output
```

**Rule of thumb**: Use either `temperature` OR `top_p`, not both. OpenAI recommends adjusting one while keeping the other at its default.

### `max_tokens`

Caps the response length. Essential for cost control.

```
DJ commentary: max_tokens = 100-150 (2-3 sentences)
Long-form:     max_tokens = 1000+
```

**Warning**: If the model hits `max_tokens`, the response is **cut off mid-sentence**. Set it slightly higher than needed to avoid truncation.

### `stop` Sequences

Tells the model to stop generating when it produces a specific string:

```json
{
  "stop": ["\n\n", "END"]  // Stop at double newline or "END"
}
```

Useful for preventing the model from generating beyond the expected output format.

## DJ.ai Implementation

| File | Relevant Settings |
|------|-------------------|
| `electron-app/src/services/AICommentaryService.ts` | Temperature, max_tokens configured per provider |

### DJ.ai's Commentary Settings

```typescript
// Typical settings for DJ commentary
{
  temperature: 0.8,    // Creative but coherent
  max_tokens: 150,     // Enough for 2-3 sentences
}
```

**Why 0.8?** DJ commentary should be:
- ✅ Creative (no two introductions sound the same)
- ✅ Coherent (grammatically correct, makes sense)
- ❌ Not chaotic (no random tangents or gibberish)

Temperature 0.8 hits the sweet spot — varied enough to be interesting, stable enough to be reliable.

## Experimentation Tips

1. **Start at 0.7**, adjust up for more variety, down for more consistency
2. **Generate 10 samples** at each temperature to compare distribution
3. **Different tasks, different temperatures** — don't use the same setting for everything
4. **max_tokens should slightly exceed expected output** — avoids truncation
5. **Monitor in production** — if commentary gets weird, lower the temperature

## Key Takeaways

- Temperature controls randomness: 0=deterministic, 2=chaotic
- DJ.ai uses ~0.8 for creative but coherent commentary
- Use `temperature` OR `top_p`, not both simultaneously
- Always set `max_tokens` to control cost and prevent runaway responses
- Test with multiple samples to understand the effect of parameter changes

## References

- [OpenAI — Temperature Parameter](https://platform.openai.com/docs/api-reference/chat/create#chat-create-temperature)
- [OpenAI — Best Practices](https://platform.openai.com/docs/guides/text-generation/how-should-i-set-the-temperature-parameter)
- [Anthropic — Sampling Parameters](https://docs.anthropic.com/en/api/messages#body-temperature)
