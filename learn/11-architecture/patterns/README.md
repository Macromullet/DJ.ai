# Design Patterns

## The Concept

Design patterns are **reusable solutions to common software design problems**. They aren't copy-paste code — they're named approaches that experienced developers recognize and apply. Knowing patterns lets you communicate architecture decisions concisely: "We're using the Strategy pattern for providers" tells a developer exactly how the code is structured.

## Patterns Used in DJ.ai

| Pattern | Where It's Used | Why |
|---------|----------------|-----|
| [OAuth-Only Middle Tier](./oauth-only-middle-tier.md) | Backend architecture | Performance, cost, simplicity |
| [Provider Interface (Strategy)](./provider-interface.md) | Music providers | Multi-provider abstraction |
| [IPC Bridge](./ipc-bridge.md) | Electron ↔ renderer | Secure cross-process communication |
| [Dependency Injection](./dependency-injection.md) | Both frontend and backend | Testability, loose coupling |
| [Feature Flags](./feature-flags.md) | Test mode | Runtime configuration, mock services |
| [Ref-Based Handlers](./ref-based-handlers.md) | React event callbacks | Stable references, avoid stale closures |
| [Request ID Cancellation](./request-id-cancellation.md) | TTS services | Prevent async race conditions |

## Learning Order

Start with the **OAuth-Only Middle Tier** — it's the core architectural decision that everything else depends on. Then study the **Provider Interface** to understand how multi-provider support works. The remaining patterns can be learned in any order.

## Key Takeaways

- Patterns are tools for communication, not rigid templates
- DJ.ai combines well-known patterns (Strategy, DI) with domain-specific ones (OAuth-only, request ID cancellation)
- Each pattern exists to solve a specific problem — understand the problem before studying the solution
- Good architecture is a collection of patterns working together

## Further Reading

- [Refactoring Guru: Design Patterns](https://refactoring.guru/design-patterns)
- [Martin Fowler: Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/)
