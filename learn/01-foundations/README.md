# 01 — Foundations

> Languages and runtimes that power DJ.ai: TypeScript, C#, JavaScript, and Node.js.

DJ.ai is a polyglot application. The **frontend** is written in TypeScript (compiled to JavaScript), the **Electron main process** uses plain JavaScript (CommonJS), and the **backend** is C# running on .NET 8. Understanding these languages and their runtimes is essential before diving into frameworks and libraries.

---

## 🗺️ Learning Path

```
TypeScript (primary language)
├── Type System ────────── Static types, inference, narrowing
├── Generics ───────────── Generic types, constraints, utility types
├── Interfaces & Types ─── Interface vs type, extending, declaration merging
└── Async Patterns ─────── Promises, async/await, error handling

C# (backend language)
├── Async/Await ────────── Task-based async, cancellation tokens
├── Dependency Injection ─ Service lifetimes, registration, resolution
└── Records & Patterns ─── Record types, pattern matching

JavaScript (Electron main process)
├── ES Modules vs CJS ──── import/export vs require()
├── Closures & Scope ───── Lexical scope, stale closure bugs
└── Event Loop ─────────── Microtasks, macrotasks, async scheduling

Node.js (runtime)
├── Package Management ─── npm, package.json, semver
└── Streams & Buffers ──── Buffer, ArrayBuffer, base64 encoding
```

---

## 📚 Topics

### [TypeScript](./typescript/README.md)
The primary language for all frontend and renderer code. DJ.ai enforces strict TypeScript across the entire `electron-app/src/` directory.

- [Type System](./typescript/type-system.md) — Static typing, inference, and narrowing
- [Generics](./typescript/generics.md) — Generic types, constraints, and utility types
- [Interfaces & Types](./typescript/interfaces-and-types.md) — Interface vs type alias, extending
- [Async Patterns](./typescript/async-patterns.md) — Promises, async/await, error handling

### [C#](./csharp/README.md)
The backend language for Azure Functions. DJ.ai's OAuth proxy is built on .NET 8 with the isolated worker model.

- [Async/Await](./csharp/async-await.md) — Task-based async programming
- [Dependency Injection](./csharp/dependency-injection.md) — Service registration and lifetimes
- [Records & Patterns](./csharp/records-and-patterns.md) — Record types and pattern matching

### [JavaScript](./javascript/README.md)
Vanilla JavaScript for the Electron main process. Understanding CommonJS is critical since Electron's main process doesn't use ESM.

- [ES Modules vs CommonJS](./javascript/es-modules-vs-commonjs.md) — Module systems explained
- [Closures & Scope](./javascript/closures-and-scope.md) — Lexical scope and closure pitfalls
- [Event Loop](./javascript/event-loop.md) — How async JavaScript actually works

### [Node.js](./nodejs/README.md)
The runtime that powers both the Electron main process and the development toolchain (Vite, npm).

- [Package Management](./nodejs/package-management.md) — npm, package.json, lock files
- [Streams & Buffers](./nodejs/streams-and-buffers.md) — Binary data handling

---

## 🎯 Key Takeaways

- **TypeScript** provides type safety across the entire frontend — catching bugs at compile time
- **C#** brings enterprise-grade async and DI patterns to the backend
- **JavaScript** (CommonJS) is still required for Electron's main process
- **Node.js** is the runtime for development tooling and Electron itself
- Understanding async patterns in both TypeScript and C# is critical — DJ.ai is async everywhere
