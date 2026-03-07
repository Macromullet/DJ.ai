# Test Pyramid

## Concept

The **Test Pyramid** is a testing strategy that balances cost, speed, and confidence across three layers:

```
        /  E2E  \          Few, slow, expensive, high confidence
       /----------\
      / Integration \      Medium count, moderate speed
     /----------------\
    /     Unit Tests    \   Many, fast, cheap, focused
   /____________________\
```

The pyramid shape reflects the ideal distribution: many fast unit tests at the base, fewer integration tests in the middle, and a small number of E2E tests at the top. Each layer catches different types of bugs at different costs.

## The Three Layers

### Unit Tests (Base)

- **What:** Test a single function, class, or component in isolation
- **Speed:** Milliseconds per test
- **Mocking:** External dependencies mocked (fetch, localStorage, KeyVault)
- **Catches:** Logic errors, mapping bugs, edge cases, null handling

### Integration Tests (Middle)

- **What:** Test how components work together (e.g., provider + DI container)
- **Speed:** Seconds per test
- **Mocking:** Minimal — only true external services
- **Catches:** Interface mismatches, configuration errors, data flow bugs

### E2E Tests (Top)

- **What:** Test complete user journeys through the real UI
- **Speed:** Seconds to minutes per test
- **Mocking:** None (or minimal — real browser, real server)
- **Catches:** Integration failures, UI rendering bugs, navigation issues

## DJ.ai's Test Distribution

| Layer | Framework | Count | Location |
|-------|-----------|-------|----------|
| Unit | Vitest | ~400+ | `electron-app/src/**/*.test.{ts,tsx}` |
| Component Integration | Vitest + RTL | Included above | Same directory as source |
| Backend Unit | xUnit + Moq | 123 | `oauth-proxy.Tests/` |
| E2E | Playwright | 8 specs | `electron-app/tests/` |

### Frontend Example Distribution

```
Unit tests (pure logic):
  - Provider mapping functions
  - Utility functions (validateApiKey, secretStorage)
  - Service methods (TTS, AI commentary)

Component tests (React + RTL):
  - Settings component renders correct provider options
  - OnboardingWizard navigates between steps
  - App component handles state transitions

E2E tests (Playwright):
  - Full onboarding flow
  - Provider connection and search
  - Playback controls
```

## Cost/Speed Tradeoffs

| Aspect | Unit | Integration | E2E |
|--------|------|-------------|-----|
| Execution time | ~1ms | ~100ms | ~5s |
| Maintenance cost | Low | Medium | High |
| Flakiness risk | Very low | Low | Medium-High |
| Bug isolation | Precise | Moderate | Poor |
| Confidence | Focused | Moderate | High |

## Why Not Just E2E Everything?

It's tempting to write only E2E tests because they test the "real thing." But:

1. **Slow feedback** — Minutes vs. milliseconds; developers stop running them
2. **Flaky** — Network, timing, browser state all introduce non-determinism
3. **Poor isolation** — When an E2E test fails, you don't know which layer broke
4. **Expensive to maintain** — UI changes break E2E tests even when logic is fine
5. **Combinatorial explosion** — Testing every edge case at E2E level is impractical

## Key Takeaways

- The pyramid shape is about ROI, not prestige — unit tests catch the most bugs per dollar
- E2E tests verify critical user journeys, not every permutation
- Component tests (Vitest + RTL) bridge the gap — rendering real React components with mocked boundaries
- Backend tests with Moq + FluentAssertions cover OAuth logic without hitting real Azure services

## DJ.ai Connection

DJ.ai's pyramid is weighted toward unit and component tests (414 frontend + 123 backend) with Playwright E2E covering critical paths. The `scripts/test-summary.ps1` script aggregates all three layers into a single `summary.json` for MOE reviews — giving agents a complete picture of test health across the pyramid.

## Further Reading

- [The Practical Test Pyramid (Martin Fowler)](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Just Say No to More End-to-End Tests (Google Testing Blog)](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)
- [Testing Trophy (Kent C. Dodds)](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
