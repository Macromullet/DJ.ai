# TypeScript

> DJ.ai's primary language — every file in `electron-app/src/` is TypeScript.

TypeScript is a statically-typed superset of JavaScript developed by Microsoft. It adds a powerful type system on top of JavaScript, enabling better tooling, earlier error detection, and self-documenting code. DJ.ai chose TypeScript for the entire frontend to enforce interface contracts between music providers, AI services, and the React UI layer.

---

## Why DJ.ai Uses TypeScript

1. **Interface contracts** — `IMusicProvider`, `ITTSService`, and `IAICommentaryService` define strict contracts that every provider and service must implement
2. **Refactoring safety** — changing a method signature instantly reveals all call sites that need updating
3. **IDE experience** — autocomplete, inline documentation, and go-to-definition across the codebase
4. **Compile-time errors** — catch `undefined` access, wrong argument types, and missing properties before runtime

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Type System](./type-system.md) | Static types, inference, narrowing — the foundation |
| 2 | [Interfaces & Types](./interfaces-and-types.md) | Interface vs type, extending, declaration merging |
| 3 | [Generics](./generics.md) | Generic types, constraints, utility types |
| 4 | [Async Patterns](./async-patterns.md) | Promises, async/await, error handling |

---

## 🔗 DJ.ai Connection

| File | TypeScript Usage |
|------|-----------------|
| `electron-app/src/types/IMusicProvider.ts` | Core provider interface with 15+ typed methods |
| `electron-app/src/types/ITTSService.ts` | TTS service contract with optional methods |
| `electron-app/src/types/IAICommentaryService.ts` | AI commentary generation interface |
| `electron-app/src/config/container.ts` | Generic DI container with typed service resolution |
| `electron-app/src/providers/*.ts` | Concrete implementations of IMusicProvider |
| `electron-app/src/services/*.ts` | Concrete implementations of ITTSService |

---

## 📖 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — Official comprehensive guide
- [TypeScript Playground](https://www.typescriptlang.org/play) — Try TypeScript in the browser
- [Total TypeScript](https://www.totaltypescript.com/) — Advanced patterns and exercises
