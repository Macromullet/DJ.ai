# 12 — Advanced Topics

## Overview

This section covers advanced technologies and patterns used in DJ.ai that go beyond typical web development. These topics assume familiarity with the fundamentals covered in earlier sections.

## What Makes These "Advanced"?

Each topic here involves either:
- **Specialized domain knowledge** (audio engineering, distributed tracing)
- **Complex distributed systems** (Redis data structures, observability pipelines)
- **Optimization techniques** (prefetching, memory management, bundle optimization)
- **Novel process patterns** (multi-model AI code review)

## Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [OpenTelemetry](./opentelemetry/) | Distributed tracing and observability |
| 2 | [Redis](./redis/) | Data structures and rate limiting |
| 3 | [Performance](./performance/) | Prefetching, memory management, bundling |
| 4 | [MOE Review](./moe-review/) | Mixture-of-Experts AI code review |

## Prerequisites

Before diving into these topics, you should understand:
- DJ.ai's [architecture](../11-architecture/) and OAuth-only pattern
- The [design system](../09-design-system/) and CSS token approach
- The [DevOps pipeline](../10-devops/) and deployment workflow

## Key Takeaways

- Advanced doesn't mean "use always" — apply these patterns when the problem demands it
- Observability (OpenTelemetry) should be built in from the start, not added later
- Memory management (Blob URLs, caching) becomes critical in long-running desktop apps
- Multi-model code review catches bugs that any single reviewer would miss

## Further Reading

- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)
- [Designing Data-Intensive Applications](https://dataintensive.net/) (book by Martin Kleppmann)
