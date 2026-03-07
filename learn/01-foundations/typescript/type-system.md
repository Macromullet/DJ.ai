# TypeScript Type System

> Static typing, type inference, and type narrowing — the foundation of TypeScript.

TypeScript's type system is **structural** (not nominal): two types are compatible if they have the same shape, regardless of their name. This is fundamentally different from C# or Java where types must explicitly declare relationships. Understanding this concept is key to writing idiomatic TypeScript in DJ.ai.

---

## Core Concepts

### Static Typing

TypeScript checks types at **compile time**, not runtime. When you run `npx tsc --noEmit` in DJ.ai, the compiler verifies that every variable, parameter, and return value matches its declared type — and all type annotations are erased in the emitted JavaScript.

```typescript
// Explicit typing
let trackTitle: string = "Bohemian Rhapsody";
let durationMs: number = 354000;
let isPlaying: boolean = false;

// Object types
let track: { id: string; title: string; artist: string };
```

### Type Inference

TypeScript can **infer** types from context, so you don't need to annotate everything. DJ.ai leverages inference heavily — most local variables don't have explicit annotations because the compiler infers them from assignments, return types, and function arguments.

```typescript
// TypeScript infers `results` as SearchResult[]
const results = await provider.searchTracks("Queen");

// Inferred as number
const count = results.length;

// Inferred from the return type of useState
const [isPlaying, setIsPlaying] = useState(false); // boolean
```

### Type Narrowing

Narrowing is how TypeScript refines a broad type into a more specific one within a code block. This is essential in DJ.ai when handling union types — for example, checking whether an optional album field exists before using it.

```typescript
// typeof narrowing
function formatDuration(ms: number | undefined): string {
  if (typeof ms === "undefined") return "--:--";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Truthiness narrowing
function displayAlbum(track: SearchResult) {
  if (track.album) {
    // TypeScript knows `album` is string here, not string | undefined
    console.log(`From: ${track.album}`);
  }
}

// Discriminated unions
type Result = { success: true; data: string } | { success: false; error: string };
function handle(result: Result) {
  if (result.success) {
    console.log(result.data);   // TS knows `data` exists
  } else {
    console.log(result.error);  // TS knows `error` exists
  }
}
```

### Literal Types and Union Types

DJ.ai uses literal types extensively for provider IDs and configuration options:

```typescript
// From IMusicProvider.ts — providerId is a union of string literals
readonly providerId: 'spotify' | 'apple';

// From Settings — TTS provider selection
ttsProvider: 'web-speech' | 'openai' | 'gemini' | 'elevenlabs';
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/types/IMusicProvider.ts`** — Uses literal union types for `providerId`, optional properties (`album?: string`), and structured return types (`Promise<SearchResult[]>`)
- **`electron-app/src/App.tsx`** — Extensive type inference with `useState` hooks; narrowing checks before accessing optional track properties
- **`electron-app/src/config/container.ts`** — Type-safe service container using mapped types and keyof
- **`electron-app/src/components/Settings.tsx`** — Union types for `SettingsConfig` fields like `currentProvider`, `aiProvider`, `ttsProvider`

---

## 🎯 Key Takeaways

- TypeScript uses **structural typing** — shape matters, not name
- **Type inference** reduces boilerplate; let the compiler work for you
- **Narrowing** (typeof, truthiness, discriminated unions) refines types in branches
- **Literal union types** like `'spotify' | 'apple'` constrain values at compile time
- Run `npx tsc --noEmit` to type-check DJ.ai without emitting JavaScript

---

## 📖 Resources

- [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — Official TypeScript handbook on basic types
- [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — Deep dive into type narrowing techniques
- [Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html) — How TypeScript infers types
- [Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types) — String and numeric literal types
