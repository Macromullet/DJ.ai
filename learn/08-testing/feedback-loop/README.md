# Test Feedback Loop — Machine-Readable Output

## Concept

A **test feedback loop** connects test results back to the development process. In DJ.ai, this loop is optimized for **agent consumption**: test output is structured as machine-readable JSON, aggregated across all test suites, and formatted for AI model review.

When tests produce machine-readable output, AI agents can:
- Identify failing tests and their root causes
- Correlate failures across frontend, backend, and E2E suites
- Suggest fixes based on error messages and stack traces
- Track test health trends across commits

## DJ.ai's Feedback Pipeline

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Vitest     │   │   xUnit      │   │  Playwright   │
│  (414 tests) │   │ (123 tests)  │   │  (8 specs)    │
├──────────────┤   ├──────────────┤   ├──────────────┤
│ JSON + JUnit │   │ TRX format   │   │ JSON + JUnit  │
└──────┬───────┘   └──────┬───────┘   └──────┬────────┘
       │                  │                   │
       └──────────┬───────┘───────────────────┘
                  │
        ┌─────────▼──────────┐
        │ test-summary.ps1   │
        │ (PowerShell script)│
        ├────────────────────┤
        │ summary.json       │
        │ PASS/FAIL + details│
        └─────────┬──────────┘
                  │
        ┌─────────▼──────────┐
        │  MOE Agent Review  │
        │  (AI models parse  │
        │   structured data) │
        └────────────────────┘
```

## Reporter Configuration

### Vitest Reporters

In `electron-app/vitest.config.ts`:

```typescript
reporters: ['default', 'json', 'junit'],
outputFile: {
  json: 'test-results/vitest-results.json',
  junit: 'test-results/vitest-junit.xml'
}
```

- **default** — Human-readable console output
- **json** — Machine-readable: passed/failed/skipped per file, error messages
- **junit** — CI system integration (Azure DevOps, GitHub Actions)

### Playwright Reporters

In `electron-app/playwright.config.ts`:

```typescript
reporter: [
  ['list'],
  ['json', { outputFile: 'test-results/playwright-results.json' }],
  ['html', { outputFolder: 'playwright-report' }],
  ['junit', { outputFile: 'test-results/playwright-junit.xml' }]
]
```

### xUnit Output

```bash
dotnet test --logger "trx;LogFileName=backend-results.trx"
```

## scripts/test-summary.ps1

The `scripts/test-summary.ps1` script (~177 lines) aggregates results from all three test suites into a single unified report.

### What It Does

1. **Parses Vitest JSON** — Extracts passed/failed/skipped/total per file, records failures with test name and error message
2. **Parses xUnit TRX** — Reads XML counters and individual test results, extracts failures with error message and stack trace
3. **Parses Playwright JSON** — Recursively walks the test suite tree, aggregates results, records failures
4. **Outputs `summary.json`** — Single file with unified schema

### Output Schema

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "overall": "FAIL",
  "suites": {
    "unit": {
      "passed": 410,
      "failed": 4,
      "skipped": 0,
      "total": 414,
      "duration": 12.5
    },
    "backend": {
      "passed": 123,
      "failed": 0,
      "skipped": 0,
      "total": 123
    },
    "e2e": {
      "passed": 7,
      "failed": 1,
      "skipped": 0,
      "total": 8
    }
  },
  "failures": [
    {
      "suite": "unit",
      "file": "src/providers/SpotifyProvider.test.ts",
      "test": "searchTracks maps response correctly",
      "error": "Expected 'Get Lucky' but received undefined"
    }
  ]
}
```

### Running the Summary

```powershell
.\scripts\test-summary.ps1
```

Console output shows:
- Test counts per suite (passed/failed/skipped)
- Overall PASS/FAIL status
- Failure details with file, test name, and error message

## Agent-Friendly Output

DJ.ai also provides a `test:failures` npm script that outputs failures in a format optimized for AI agent parsing:

```bash
cd electron-app
npm run test:failures
```

This outputs only failure information — no noise from passing tests — making it efficient for agents to consume and act on.

## Key Takeaways

- Machine-readable test output enables AI-powered test review
- Multiple reporters serve different audiences: console for humans, JSON for agents, JUnit for CI
- `test-summary.ps1` unifies three test suites into one actionable report
- The feedback loop closes when AI agents parse failures, suggest fixes, and verify the fix works

## DJ.ai Connection

The test feedback loop is central to DJ.ai's Mixture-of-Experts (MOE) workflow. When a PR is submitted, the test summary is generated and fed to multiple AI models for review. Each model examines failures from a different perspective (test quality, root cause analysis, coverage gaps), producing a comprehensive review that catches issues humans might miss.

## Further Reading

- [Vitest Reporters](https://vitest.dev/guide/reporters)
- [Playwright Reporters](https://playwright.dev/docs/test-reporters)
- [xUnit TRX Format](https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-with-dotnet-test#test-results)
