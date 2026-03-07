# TypeScript Generics

> Write type-safe code that works with any type — without sacrificing type information.

Generics allow you to write functions, classes, and interfaces that work with multiple types while preserving full type safety. Instead of using `any` (which disables type checking), generics let you create reusable components that maintain type relationships. DJ.ai's DI container and provider architecture rely heavily on generics.

---

## Core Concepts

### Generic Functions

A generic function declares a **type parameter** (conventionally `T`) that gets filled in when the function is called:

```typescript
// Without generics — loses type information
function first(arr: any[]): any {
  return arr[0];
}

// With generics — preserves the type
function first<T>(arr: T[]): T {
  return arr[0];
}

const track = first(searchResults); // TypeScript infers: SearchResult
const name = first(["Queen", "Beatles"]); // TypeScript infers: string
```

### Generic Interfaces

DJ.ai's DI container uses a generic interface to enforce type-safe service resolution:

```typescript
// Simplified version of DJ.ai's container pattern
interface ServiceContainer {
  musicProvider: IMusicProvider;
  ttsService: ITTSService;
  aiCommentaryService?: IAICommentaryService;
}

class DIContainer {
  private services = new Map<string, unknown>();

  register<K extends keyof ServiceContainer>(
    key: K,
    service: ServiceContainer[K]
  ): void {
    this.services.set(key, service);
  }

  get<K extends keyof ServiceContainer>(key: K): ServiceContainer[K] {
    return this.services.get(key) as ServiceContainer[K];
  }
}

// Usage — fully type-safe
container.register('musicProvider', new SpotifyProvider());
const provider = container.get('musicProvider'); // typed as IMusicProvider
```

### Generic Constraints

Constraints limit what types a generic can accept using `extends`:

```typescript
// Only accept objects with an 'id' property
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Works with SearchResult (has 'id')
const track = findById(searchResults, "abc123");

// Compile error: number[] doesn't have 'id'
// findById([1, 2, 3], "1"); ← ERROR
```

### Utility Types

TypeScript includes built-in utility types that transform existing types — DJ.ai uses these throughout:

```typescript
// Partial<T> — all properties optional
type PartialSettings = Partial<SettingsConfig>;
// Useful for update functions: updateSettings({ ttsEnabled: false })

// Pick<T, K> — select specific properties
type TrackSummary = Pick<SearchResult, 'id' | 'title' | 'artist'>;

// Omit<T, K> — exclude specific properties
type TrackWithoutProvider = Omit<SearchResult, 'providerData'>;

// Record<K, V> — object type with known keys
type ProviderMap = Record<string, IMusicProvider>;

// Required<T> — all properties required (opposite of Partial)
type RequiredAuth = Required<AuthenticationResult>;
```

### The `keyof` Operator

`keyof` extracts the keys of a type as a union — critical for the DI container:

```typescript
type ServiceKeys = keyof ServiceContainer;
// Equivalent to: 'musicProvider' | 'ttsService' | 'aiCommentaryService'
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/config/container.ts`** — The `DIContainer` class uses `register<K>` and `get<K>` generics with `keyof ServiceContainer` constraints for type-safe service registration and resolution
- **`electron-app/src/types/IMusicProvider.ts`** — `Promise<SearchResult[]>`, `Promise<AuthenticationResult>`, etc. use generic Promise types throughout
- **`electron-app/src/App.tsx`** — `useState<SettingsConfig>()`, `useRef<boolean>()`, and other React hooks use generics to type component state
- **`electron-app/src/config/productionMode.ts`** — Uses `Partial<ServiceContainer>` when registering services incrementally

---

## 🎯 Key Takeaways

- **Generics** preserve type information where `any` would discard it
- **Constraints** (`extends`) limit generics to types with specific shapes
- **`keyof`** turns object types into union types of their keys
- **Utility types** (`Partial`, `Pick`, `Omit`, `Record`, `Required`) transform existing types without rewriting them
- DJ.ai's DI container is the prime example: `container.get('musicProvider')` returns `IMusicProvider`, not `unknown`

---

## 📖 Resources

- [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html) — Official handbook chapter on generics
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html) — Complete reference for built-in type utilities
- [keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html) — Using keyof for type-safe property access
- [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) — Advanced type transformation patterns
