# Prefetch & Look-Ahead Pattern

## The Concept

**Prefetching** loads resources *before* they're needed so that when the user requests them, the response is instant. In DJ.ai, the most impactful prefetch is **generating the next track's AI commentary and TTS audio while the current track is still playing.**

### The Problem Without Prefetching

```
Track A finishes
  → User waits while AI generates commentary (1-3 seconds)
    → User waits while TTS converts text to audio (1-2 seconds)
      → Commentary plays (finally!)
        → Track B starts

Total gap: 2-5 seconds of silence
```

### The Solution With Prefetching

```
Track A playing (60% through)
  → Background: AI generates commentary for Track B
  → Background: TTS converts commentary to audio
  → Result cached and ready

Track A finishes
  → Commentary plays IMMEDIATELY (pre-generated)
  → Track B starts

Total gap: 0 seconds
```

## How DJ.ai Implements Prefetching

### Auto-DJ Look-Ahead

The Auto-DJ feature pre-generates the next track's commentary while the current track plays:

```typescript
// Simplified prefetch logic
async function onTrackProgress(currentTrack: Track, progress: number) {
  // Start prefetching at 70% through the current track
  if (progress > 0.7 && !prefetchedNext) {
    const nextTrack = await provider.getRecommendations(currentTrack);
    const commentary = await aiService.generateCommentary(nextTrack[0]);
    const audioBlob = await ttsService.synthesize(commentary);

    // Cache the result
    prefetchCache.set(nextTrack[0].id, {
      track: nextTrack[0],
      commentary,
      audioBlob
    });
    prefetchedNext = true;
  }
}

async function onTrackEnd() {
  const cached = prefetchCache.get(nextTrackId);
  if (cached) {
    // Instant — no waiting!
    playCommentary(cached.audioBlob);
    playTrack(cached.track);
  } else {
    // Fallback: generate on-demand
    await generateAndPlay(nextTrack);
  }
}
```

### When to Trigger Prefetch

| Trigger | % Through Track | Rationale |
|---------|----------------|-----------|
| Too early (30%) | Risk of wasted work if user skips | |
| Sweet spot (70%) | Usually enough time to complete | ✅ |
| Too late (95%) | May not finish before track ends | |

### Cancellation on Skip

If the user skips before prefetching completes, the in-flight request is abandoned using the [request ID cancellation pattern](../../11-architecture/patterns/request-id-cancellation.md):

```typescript
function onUserSkip() {
  prefetchRequestId++; // Invalidate in-flight prefetch
  prefetchedNext = false;
  prefetchCache.clear();
}
```

## DJ.ai Connection

The Auto-DJ feature in DJ.ai pre-generates AI commentary and TTS audio for the upcoming track, creating a seamless listening experience with zero gaps between tracks. The prefetch logic monitors playback progress and triggers at ~70% completion. Cached results are stored in memory and consumed when the track transitions. This is one of DJ.ai's key UX differentiators.

## Key Takeaways

- Prefetching turns perceived latency into background work
- Trigger prefetch early enough to complete, but not so early that skips waste work
- Always handle cancellation — users skip tracks, invalidating prefetched content
- Cache prefetched results in memory; clean up on skip or navigation

## Further Reading

- [web.dev: Prefetch Resources](https://web.dev/articles/link-prefetch)
- [Patterns.dev: Prefetch Pattern](https://www.patterns.dev/vanilla/prefetch/)
