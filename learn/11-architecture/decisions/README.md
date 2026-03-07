# Architecture Decision Records

## The Concept

**Architecture Decision Records (ADRs)** document the key decisions that shape a system — the *why* behind the *what*. Every significant architectural choice involves tradeoffs, and ADRs capture the context, options considered, and rationale so future developers understand the reasoning.

An ADR answers three questions:
1. **What** decision was made?
2. **Why** was this option chosen over alternatives?
3. **What are the consequences** (positive and negative)?

## DJ.ai's Key Decisions

| Decision | Rationale | File |
|----------|-----------|------|
| [Why Electron](./why-electron.md) | Cross-platform desktop with web tech | Balances platform reach vs native performance |
| [Why Azure Functions](./why-azure-functions.md) | Serverless for OAuth operations | Pay-per-use, scales to zero |
| [Why No API Proxy](./why-no-api-proxy.md) | Direct client→provider calls | Performance, cost, simplicity |

## ADR Template

```markdown
# ADR: [Title]

## Status
Accepted / Proposed / Superseded

## Context
What is the problem or situation that requires a decision?

## Decision
What did we choose?

## Alternatives Considered
What other options were evaluated?

## Consequences
What are the positive and negative effects of this decision?
```

## Key Takeaways

- Document *why*, not just *what* — code shows what, ADRs explain why
- Capture alternatives considered — it prevents re-litigating decisions
- ADRs are not permanent — they can be superseded by new decisions with new context
- Write ADRs when the decision would surprise a future developer

## Further Reading

- [Michael Nygard: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub Organization](https://adr.github.io/)
