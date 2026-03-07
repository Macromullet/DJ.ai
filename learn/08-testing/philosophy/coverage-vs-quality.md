# Coverage vs. Quality

## Concept

Code coverage measures what percentage of your source code is **executed** during tests. It does not measure whether the tests actually **verify** correct behavior. This distinction is critical: you can achieve 100% coverage with tests that assert nothing meaningful.

> **50% meaningful coverage beats 95% tautological coverage.**

Coverage is a useful signal that you're not missing large areas of code, but it's a terrible goal in itself.

## What Coverage Actually Measures

Coverage tools (like V8 in Vitest) track four metrics:

| Metric | Measures | Example |
|--------|----------|---------|
| **Statement** | Lines executed | `const x = foo();` was run |
| **Branch** | Decision paths taken | Both `if` and `else` were executed |
| **Function** | Functions called | `searchTracks()` was invoked |
| **Line** | Source lines hit | Similar to statement, slightly different granularity |

### What Coverage Does NOT Measure

- Whether assertions verify the right things
- Whether edge cases are covered
- Whether error paths are tested meaningfully
- Whether the test would catch a real bug

## The Tautological Coverage Trap

```typescript
// This test achieves 100% coverage of searchTracks()
test('searchTracks', async () => {
  const provider = new SpotifyProvider(config);
  vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);
  await provider.searchTracks('test');
  // No assertions! Coverage says 100%, but this catches ZERO bugs.
});
```

The code was executed, all branches were hit, but the test would pass even if `searchTracks` returned `null`, threw an error, or returned the wrong data. **Coverage: 100%. Value: 0%.**

## DJ.ai's Approach

### Coverage Thresholds

In `electron-app/vitest.config.ts`, coverage thresholds are set at 70%:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'lcov'],
  reportsDirectory: 'test-results/coverage',
  include: ['src/**/*.{ts,tsx}'],
  // Thresholds enforce minimum coverage
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70
  }
}
```

### Why 70%, Not 90%?

- **70% catches missing test files** — ensures major features have tests
- **Not 90%** — avoids incentivizing padding with tautological tests to hit a number
- **Quality enforcement** — MOE reviews catch tautological tests that coverage metrics miss

### Running Coverage

```bash
cd electron-app
npm run test:coverage
```

Outputs to `test-results/coverage/` with text summary, JSON data, and lcov for IDE integration.

## How to Use Coverage Productively

### ✅ Good Uses

1. **Find untested code** — Sort by uncovered files to find gaps
2. **Verify branch coverage** — Ensure error handling paths are tested
3. **Track trends** — Coverage dropping suggests new code lacks tests
4. **CI gates** — Prevent merging code that drops below the threshold

### ❌ Bad Uses

1. **Target 100%** — Leads to meaningless tests for getters/setters
2. **Gamify the metric** — "I added 10 tests!" (that all test mocks)
3. **Skip review** — Coverage doesn't replace code review of test quality
4. **Ignore quality** — High coverage with poor assertions is worse than low coverage with great assertions

## Key Takeaways

- Coverage measures execution, not correctness — it's a necessary but insufficient quality signal
- Set reasonable thresholds (DJ.ai uses 70%) and enforce quality through reviews
- Use coverage to find gaps, not to celebrate numbers
- The MOE review process is DJ.ai's answer to the quality gap that coverage metrics can't close

## DJ.ai Connection

DJ.ai's coverage strategy is deliberately moderate: 70% thresholds catch missing test files without incentivizing coverage padding. Real quality assurance comes from the MOE review process, where multiple AI models review test assertions for anti-tautology compliance. The `npm run test:coverage` output feeds into the test summary pipeline, giving both humans and agents a complete picture.

## Further Reading

- [Code Coverage Best Practices (Google Testing Blog)](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)
- [How Much Testing is Enough? (Martin Fowler)](https://martinfowler.com/bliki/TestCoverage.html)
- [V8 Coverage Provider (Vitest)](https://vitest.dev/guide/coverage)
