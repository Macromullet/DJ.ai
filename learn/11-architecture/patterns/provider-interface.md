# Provider Interface (Strategy Pattern)

## The Concept

The **Strategy Pattern** defines a family of algorithms (or behaviors), encapsulates each one, and makes them interchangeable. In DJ.ai, "algorithms" are music providers — Spotify and Apple Music — that all implement the same interface but have completely different internal implementations.

```
IMusicProvider (interface)
├── SpotifyProvider        → Spotify Web API
└── AppleMusicProvider     → Apple Music API
```

The application code works with `IMusicProvider` — it doesn't know or care which concrete provider is active. Swapping providers changes behavior without modifying the consumer.

## The IMusicProvider Interface

Defined in `electron-app/src/types/`, the interface specifies the contract every provider must fulfill:

```typescript
interface IMusicProvider {
  // Authentication
  authenticate(): Promise<void>;
  handleOAuthCallback(url: string): Promise<boolean>;
  isAuthenticated(): boolean;

  // Search & Discovery
  searchTracks(query: string): Promise<SearchResult[]>;
  getRecommendations(track: Track): Promise<SearchResult[]>;
  getUserTopTracks(): Promise<SearchResult[]>;

  // Playback
  playTrack(result: SearchResult): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;

  // State
  getCurrentTrack(): Track | null;
  getPlaybackState(): PlaybackState;
}
```

### How to Add a New Provider

1. **Create the provider** — `electron-app/src/providers/NewProvider.ts`
2. **Implement `IMusicProvider`** — Fill in all methods using the provider's API
3. **Add OAuth endpoints** — `oauth-proxy/Functions/NewProviderOAuthFunctions.cs`
4. **Register in Settings UI** — Add to the provider selection dropdown
5. **Update docs** — Add to `ARCHITECTURE.md`

### Example: Spotify Implementation

```typescript
class SpotifyProvider implements IMusicProvider {
  async searchTracks(query: string): Promise<SearchResult[]> {
    // Calls Spotify Web API directly using stored OAuth token
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=track`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    );
    // Transform Spotify response to SearchResult format
  }
}
```

### Example: Apple Music Would Differ Completely

```typescript
class AppleMusicProvider implements IMusicProvider {
  async searchTracks(query: string): Promise<SearchResult[]> {
    // Calls Apple Music API with different URL, params, response format
    const response = await fetch(
      `https://api.music.apple.com/v1/catalog/us/search?term=${query}&types=songs`,
      { headers: { Authorization: `Bearer ${this.developerToken}`,
                    'Music-User-Token': this.userToken } }
    );
    // Transform Apple Music response to the SAME SearchResult format
  }
}
```

## DJ.ai Connection

The IMusicProvider interface is the extensibility point of DJ.ai. The `App.tsx` component and `MusicPlayer` work with the interface — they call `searchTracks()`, `playTrack()`, etc. without knowing which provider is active. Apple Music is the default provider and Spotify is fully implemented. Each new provider is just another class implementing the same interface.

## Key Takeaways

- The Strategy Pattern makes providers interchangeable without changing consumer code
- Define the interface first, implement providers second
- Transform provider-specific responses into a common format (SearchResult, Track)
- Adding a new provider is a bounded task: implement the interface + add OAuth endpoints

## Further Reading

- [Refactoring Guru: Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [TypeScript Handbook: Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
