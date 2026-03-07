# Provider Pattern — Interface-Based Music Abstraction

## Concept

The **Strategy Pattern** (also called the Provider Pattern in this context) defines a family of interchangeable algorithms behind a common interface. In DJ.ai, each music streaming service is a "strategy" — the application logic doesn't care whether you're playing from Apple Music, Spotify, or YouTube; it talks to `IMusicProvider` and the concrete provider handles the rest.

This is a textbook application of the **Dependency Inversion Principle** (the "D" in SOLID): high-level modules depend on abstractions, not concrete implementations.

## How DJ.ai Implements It

### The Interface

Defined in `electron-app/src/types/IMusicProvider.ts`, the interface includes 27 members covering authentication, search, playback, recommendations, and playlist access. Key methods:

```typescript
authenticate(): Promise<AuthenticationResult>;
searchTracks(query: string): Promise<SearchResult[]>;
playTrack(result: SearchResult): Promise<void>;
getRecommendations(track: Track): Promise<TrackRecommendation[]>;
```

### Concrete Implementations

| Provider | File | Lines |
|----------|------|-------|
| Apple Music | `electron-app/src/providers/AppleMusicProvider.ts` | ~536 |
| Spotify | `electron-app/src/providers/SpotifyProvider.ts` | ~685 |
| YouTube | `electron-app/src/providers/YouTubeMusicProvider.ts` | ~503 |

### Dependency Injection

The DI container in `electron-app/src/config/container.ts` wires the active provider:

```typescript
const container = new DIContainer();
container.register('musicProvider', new AppleMusicProvider(config));

// Anywhere in the app:
const provider = getMusicProvider(); // Returns IMusicProvider
```

The container also manages `ITTSService` and `IAICommentaryService` — all swappable, all testable.

## Adding a New Provider (Step-by-Step)

1. **Create** `electron-app/src/providers/NewServiceProvider.ts` implementing `IMusicProvider`
2. **Add OAuth endpoints** in `oauth-proxy/Functions/NewServiceOAuthFunctions.cs` (initiate, exchange, refresh)
3. **Register secrets** in Azure Key Vault (client ID, client secret)
4. **Add to Settings UI** so users can connect the new service
5. **Register in DI container** via `container.ts`
6. **Update** `docs/ARCHITECTURE.md`

## Why This Pattern Matters

- **Testability** — Mock the provider interface without touching real APIs
- **Extensibility** — New providers don't change existing code
- **Separation of concerns** — UI components never import provider-specific code
- **Runtime switching** — Users can swap providers without restarting

## Key Takeaways

- The Strategy Pattern decouples "what" (play a track) from "how" (Spotify API vs. MusicKit JS)
- DI containers make the pattern practical — providers are registered once and injected everywhere
- Every new provider is additive, not disruptive

## DJ.ai Connection

The `IMusicProvider` interface is DJ.ai's central abstraction. The AI commentary system, TTS engine, and entire UI all program against this interface — making the app inherently multi-platform with minimal coupling.

## Further Reading

- [Strategy Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/strategy)
- [Dependency Inversion Principle (Martin)](https://web.archive.org/web/20150905081105/http://www.objectmentor.com/resources/articles/dip.pdf)
- [SOLID Principles (Wikipedia)](https://en.wikipedia.org/wiki/SOLID)
