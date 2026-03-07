# Vitest

## Overview

[Vitest](https://vitest.dev/) is DJ.ai's frontend test runner. It's a Vite-native testing framework that provides near-instant test execution, built-in TypeScript support, and Jest-compatible APIs. DJ.ai uses Vitest for all 414 frontend unit and component tests.

## Why Vitest?

- **Vite-native** — Uses the same config and transforms as DJ.ai's Vite dev server
- **Fast** — ESM-first, no compilation step, instant HMR for watch mode
- **Jest-compatible** — Familiar API (`describe`, `it`, `expect`, `vi.mock()`)
- **Built-in TypeScript** — No `ts-jest` configuration needed
- **Built-in coverage** — V8 provider included (no extra install)

## Configuration

DJ.ai's Vitest is configured in `electron-app/vitest.config.ts`:
- Environment: `jsdom` (browser APIs in Node.js)
- Globals: `true` (no need to import `describe`, `it`, `expect`)
- Setup file: `vitest.setup.ts` (global mocks)
- Reporters: `default`, `json`, `junit` (machine-readable output)
- Coverage: V8 with 70% thresholds

## Learning Path

| Topic | File | What You'll Learn |
|-------|------|-------------------|
| [Setup & Config](./setup-and-config.md) | Configuration deep dive | vitest.config.ts, environment, reporters |
| [Mocking](./mocking.md) | Test doubles | vi.mock(), vi.fn(), vi.spyOn(), setup mocks |
| [Async Testing](./async-testing.md) | Promises and timers | async/await, flush microtasks, fake timers |
| [Coverage](./coverage.md) | Code coverage | V8 provider, thresholds, reports |

## Quick Start

```bash
cd electron-app
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm run test:coverage # With coverage report
```

## DJ.ai Connection

Vitest powers DJ.ai's frontend test suite — from pure unit tests of provider mapping logic to component tests with React Testing Library. The `vitest.setup.ts` file configures global mocks that simulate the Electron environment (`window.electron`, `Audio`, `fetch`), enabling tests to run in Node.js while exercising real browser-like behavior.
