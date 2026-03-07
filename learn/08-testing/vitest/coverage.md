# Vitest Coverage

## Concept

Code coverage measures which lines, branches, functions, and statements in your source code are executed during testing. Vitest uses the **V8 coverage provider**, which leverages V8's built-in code coverage instrumentation — making it faster than Istanbul-based alternatives because no code transformation is needed.

## Configuration

In `electron-app/vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',                        // V8's native instrumentation
  reporter: ['text', 'json', 'lcov'],    // Console, machine-readable, IDE
  reportsDirectory: 'test-results/coverage',
  include: ['src/**/*.{ts,tsx}'],         // Only measure source files
  thresholds: {
    statements: 70,
    branches: 70,
    functions: 70,
    lines: 70
  }
}
```

### Reporter Types

| Reporter | Output | Purpose |
|----------|--------|---------|
| `text` | Console table | Developer feedback during test runs |
| `json` | `coverage-summary.json` | Machine-readable for agents/CI |
| `lcov` | `lcov.info` | IDE integration (VS Code coverage gutters) |

## Running Coverage

```bash
cd electron-app

# Generate coverage report
npm run test:coverage

# Output location
test-results/coverage/
├── coverage-summary.json   # Aggregate metrics
├── lcov.info               # For IDE plugins
└── index.html              # Visual HTML report (if html reporter added)
```

### Console Output Example

```
 % Coverage report from v8
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   72.4  |   68.1   |   71.2  |   72.4  |
 providers/AppleMusicProv... |   81.2  |   75.0   |   85.7  |   81.2  |
 providers/SpotifyProvider   |   78.5  |   71.3   |   80.0  |   78.5  |
 services/BrowserTTSService  |   90.1  |   85.0   |   92.3  |   90.1  |
 utils/validateApiKey.ts     |  100.0  |  100.0   |  100.0  |  100.0  |
-----------------------------|---------|----------|---------|---------|
```

## Understanding Thresholds

DJ.ai sets all thresholds at 70%:

```typescript
thresholds: {
  statements: 70,  // 70% of statements must be executed
  branches: 70,    // 70% of if/else/switch branches must be taken
  functions: 70,   // 70% of functions must be called
  lines: 70        // 70% of source lines must be hit
}
```

**Why 70%?**

- **Catches missing test files** — If a major component has zero tests, coverage drops below 70%
- **Avoids padding incentive** — 90%+ targets encourage meaningless tests to hit the number
- **Quality enforcement** — The gap between 70% and 100% is filled by MOE reviews, not metrics

### Threshold Enforcement

When coverage drops below thresholds, the test run **fails**:

```
ERROR: Coverage for statements (65.2%) does not meet global threshold (70%)
```

This prevents merging code that significantly reduces test coverage.

## V8 vs. Istanbul

| Aspect | V8 | Istanbul |
|--------|----|----------|
| Instrumentation | Native V8 engine | Source code transformation |
| Speed | ⚡ Fast (no transform) | Slower (rewrites code) |
| Accuracy | High (native) | Good (but can miss edge cases) |
| Setup | Zero config | Requires `@vitest/coverage-istanbul` |

V8 is DJ.ai's choice because it's zero-config, fast, and accurate.

## Key Takeaways

- V8 coverage is faster than Istanbul because it uses native V8 instrumentation
- Multiple reporters serve different audiences: text for developers, JSON for agents, lcov for IDEs
- 70% thresholds catch missing test files without incentivizing coverage padding
- Coverage is a signal, not a goal — see [Coverage vs. Quality](../philosophy/coverage-vs-quality.md)

## DJ.ai Connection

Coverage reports are part of DJ.ai's test summary pipeline. The JSON output feeds into `scripts/test-summary.ps1`, which aggregates coverage data alongside test results for MOE reviews. The 70% threshold acts as a safety net — ensuring major features have tests — while quality enforcement happens through agent reviews.

## Further Reading

- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [V8 Code Coverage](https://v8.dev/blog/javascript-code-coverage)
- [Coverage Best Practices (Google)](https://testing.googleblog.com/2020/08/code-coverage-best-practices.html)
