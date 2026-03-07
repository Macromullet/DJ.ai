# Playwright Setup and Configuration

## Concept

Playwright's configuration file (`playwright.config.ts`) controls browser selection, test execution parameters, reporter output, and development server management. DJ.ai's configuration is optimized for both local development (fast, parallel, no retries) and CI (sequential, with retries and artifact capture).

## playwright.config.ts

Located at `electron-app/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  // CI vs local behavior
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Multiple reporters for different audiences
  reporter: [
    ['list'],                                            // Console output
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['html', { outputFolder: 'playwright-report' }],    // Visual report
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }]
  ],

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  // Auto-start the Vite dev server
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 5173',
    port: 5173,
    timeout: 120 * 1000,    // 2 minutes to start
    reuseExistingServer: !process.env.CI,
  },
});
```

## Key Configuration Explained

### Retries and Workers

```typescript
retries: process.env.CI ? 2 : 0,   // Retry flaky tests in CI only
workers: process.env.CI ? 1 : undefined,  // Sequential in CI, parallel locally
```

- **Local:** No retries (fail fast), parallel workers (fast feedback)
- **CI:** 2 retries (handle flakiness), 1 worker (predictable resource usage)

### Failure Artifacts

```typescript
use: {
  screenshot: 'only-on-failure',  // Capture final state
  video: 'retain-on-failure',     // Record, keep only on failure
  trace: 'on-first-retry',        // Detailed trace on first retry attempt
}
```

When a test fails:
1. **Screenshot** — Shows exactly what the browser looked like
2. **Video** — Replay the entire test execution
3. **Trace** — Timeline of every action, network request, and DOM snapshot (viewable at `trace.playwright.dev`)

### Web Server

```typescript
webServer: {
  command: 'npm run dev -- --host 0.0.0.0 --port 5173',
  port: 5173,
  timeout: 120 * 1000,
  reuseExistingServer: !process.env.CI,
}
```

Playwright automatically starts the Vite dev server before running tests. In local development, it reuses an already-running server (if available). In CI, it always starts fresh.

### Reporters

| Reporter | Output | Audience |
|----------|--------|----------|
| `list` | Console | Developer running tests |
| `json` | `playwright-results.json` | Agent/script consumption |
| `html` | `playwright-report/` | Visual debugging |
| `junit` | `playwright-junit.xml` | CI systems |

## Running Tests

```bash
cd electron-app

# Standard run
npx playwright test

# With UI mode (interactive)
npx playwright test --ui

# Headed mode (see the browser)
npx playwright test --headed

# Specific test file
npx playwright test tests/onboarding.spec.ts

# Debug mode (step through)
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

## Key Takeaways

- Configuration adapts to environment (CI vs local) via `process.env.CI`
- Failure artifacts (screenshot, video, trace) are essential for debugging flaky tests
- Web server auto-start eliminates "forgot to start the server" failures
- Multiple reporters serve developers, agents, and CI systems simultaneously

## DJ.ai Connection

The Playwright configuration is tuned for DJ.ai's dual-audience workflow: developers get fast, parallel local runs, while CI gets reliable, artifact-rich sequential runs. The JSON and JUnit output feeds directly into `scripts/test-summary.ps1`, integrating E2E results alongside Vitest and xUnit data in the unified test summary.

## Further Reading

- [Playwright Test Configuration](https://playwright.dev/docs/test-configuration)
- [Playwright Getting Started](https://playwright.dev/docs/intro)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
