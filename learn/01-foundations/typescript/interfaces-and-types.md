# Interfaces and Types

> Defining the shape of data and contracts between components in TypeScript.

TypeScript provides two primary ways to define object shapes: **interfaces** and **type aliases**. While they overlap significantly, each has unique strengths. DJ.ai uses interfaces for service contracts (`IMusicProvider`, `ITTSService`) and type aliases for unions, intersections, and data shapes (`SearchResult`, `Track`). Understanding when to use each is key to maintaining a consistent, readable codebase.

---

## Core Concepts

### Interfaces

Interfaces define a contract — a set of properties and methods that an object must have. In DJ.ai, interfaces are the backbone of the provider architecture:

```typescript
// From electron-app/src/types/IMusicProvider.ts
interface IMusicProvider {
  readonly providerId: 'spotify' | 'apple';
  readonly providerName: string;
  isAuthenticated: boolean;

  authenticate(): Promise<AuthenticationResult>;
  handleOAuthCallback(callbackUrl: string): Promise<boolean>;
  signOut(): Promise<void>;
  searchTracks(query: string, limit?: number): Promise<SearchResult[]>;
  playTrack(searchResult: SearchResult): Promise<string>;
  pause(): Promise<void>;
  play(): Promise<void>;
  getRecommendations(currentTrack: SearchResult, count?: number): Promise<TrackRecommendation[]>;
}
```

Any class implementing `IMusicProvider` must provide **all** required members. TypeScript enforces this at compile time.

### Type Aliases

Type aliases name any type — not just objects. They're ideal for unions, primitives, and computed types:

```typescript
// Union type — used throughout DJ.ai
type ProviderId = 'spotify' | 'apple';
type TTSProvider = 'web-speech' | 'openai' | 'gemini' | 'elevenlabs';
type AIProvider = 'openai' | 'anthropic' | 'copilot';

// Object shape
type SearchResult = {
  id: string;
  title: string;
  artist: string;
  album?: string;          // Optional property
  thumbnailUrl?: string;
  durationMs?: number;
  providerData: any;       // Provider-specific payload
};

// Intersection type (combining types)
type TrackWithCommentary = Track & { djCommentary: string };
```

### Interface vs Type — When to Use Each

| Feature | Interface | Type Alias |
|---------|-----------|------------|
| Object shapes | ✅ Primary use | ✅ Works too |
| `extends` / inheritance | ✅ `interface B extends A` | ✅ `type B = A & { ... }` |
| `implements` (classes) | ✅ `class X implements I` | ✅ Also works |
| Union types | ❌ Cannot | ✅ `type X = A \| B` |
| Declaration merging | ✅ Auto-merges | ❌ Cannot redeclare |
| Computed/mapped types | ❌ Cannot | ✅ Full support |

**DJ.ai convention:** Use **interfaces** for contracts that classes implement (`IMusicProvider`, `ITTSService`). Use **types** for data shapes, unions, and utility types.

### Extending Interfaces

Interfaces can extend other interfaces to build on existing contracts:

```typescript
// Base playback interface
interface IPlayable {
  play(): Promise<void>;
  pause(): Promise<void>;
}

// Extended with search
interface ISearchable {
  searchTracks(query: string): Promise<SearchResult[]>;
}

// Full provider extends both
interface IMusicProvider extends IPlayable, ISearchable {
  authenticate(): Promise<AuthenticationResult>;
  // ... additional methods
}
```

### Optional Properties and Methods

DJ.ai's `ITTSService` uses optional methods for capabilities not all implementations support:

```typescript
// From electron-app/src/types/ITTSService.ts
interface ITTSService {
  speak(text: string): Promise<void>;         // Required
  renderToBlob?(text: string): Promise<Blob>; // Optional — pre-render audio
  speakFromBlob?(blob: Blob): Promise<void>;  // Optional — play pre-rendered
  stop(): void;
  setVoice(voice: string): void;
  getAvailableVoices(): Promise<TTSVoice[]>;
  isAvailable(): boolean;
}
```

The `?` suffix means a TTS implementation can omit `renderToBlob` and `speakFromBlob` — but if it provides them, they must match the declared signature. DJ.ai's `OpenAITTSService` and `ElevenLabsTTSService` implement these for pre-generation; `WebSpeechTTSService` does not.

### Declaration Merging

Interfaces with the same name automatically merge — useful for extending third-party types:

```typescript
// electron-app/src/types/electron.d.ts extends Window
interface Window {
  electron: {
    aiProxy: { request(options: any): Promise<any>; };
    safeStorage: { encrypt(text: string): Promise<string>; };
  };
}
```

This adds the `electron` property to the global `Window` type without modifying the original definition.

---

## 🔗 DJ.ai Connection

- **`electron-app/src/types/IMusicProvider.ts`** — Primary interface with `readonly` properties, optional parameters, and Promise-based async methods
- **`electron-app/src/types/ITTSService.ts`** — Interface with optional methods (`renderToBlob?`, `speakFromBlob?`) for capability-based design
- **`electron-app/src/types/IAICommentaryService.ts`** — Clean interface with `AICommentary` return type
- **`electron-app/src/types/index.ts`** — Re-exports all types including `Track`, `SearchResult`, `AuthenticationResult`
- **`electron-app/src/types/electron.d.ts`** — Declaration merging to extend `Window` with Electron APIs
- **`electron-app/src/config/container.ts`** — `ServiceContainer` interface maps service names to their types

---

## 🎯 Key Takeaways

- Use **interfaces** for contracts that classes implement — they support `extends` and declaration merging
- Use **type aliases** for unions (`'a' | 'b'`), intersections (`A & B`), and computed types
- **Optional properties** (`prop?: Type`) and **optional methods** (`method?(): void`) enable flexible contracts
- **Declaration merging** lets you extend third-party types without modifying their source
- DJ.ai uses the `I` prefix convention for interfaces (`IMusicProvider`) following the project's code style

---

## 📖 Resources

- [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — Interfaces, optional properties, extending types
- [Interfaces vs Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces) — Official comparison
- [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) — How interfaces auto-merge
