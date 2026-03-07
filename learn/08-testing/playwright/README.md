# Playwright E2E Testing

## Overview

[Playwright](https://playwright.dev/) powers DJ.ai's end-to-end (E2E) tests — 8 test specs that verify complete user journeys through a real browser. Unlike Vitest + RTL (which test components in a simulated jsdom environment), Playwright launches an actual Chromium browser and interacts with the running application.

E2E tests sit at the top of the [test pyramid](../philosophy/test-pyramid.md): few in number, high in confidence, expensive to run and maintain.

## Configuration

DJ.ai's Playwright is configured in `electron-app/playwright.config.ts`:

- **Browser:** Chromium (Desktop Chrome profile)
- **Base URL:** `http://localhost:5173` (Vite dev server)
- **Reporters:** list, JSON, HTML, JUnit
- **Retries:** 2 in CI, 0 locally
- **Workers:** 1 in CI, unlimited locally
- **Artifacts:** Screenshots on failure, video on failure, trace on first retry

## Running E2E Tests

```bash
cd electron-app

# Run all E2E tests (requires app running on :5173)
npm run test:e2e

# Run with UI mode (interactive debugging)
npm run test:ui

# Run in headed browser (watch the test run)
npm run test:headed
```

## Learning Path

| Topic | File | What You'll Learn |
|-------|------|-------------------|
| [Setup & Config](./setup-and-config.md) | Configuration deep dive | Browsers, base URL, reporters, web server |
| [Selectors & Locators](./selectors-and-locators.md) | Finding elements | getByRole, getByText, locator chaining |
| [Assertions](./assertions.md) | Verifying state | toBeVisible, toHaveText, toHaveURL |

## Key Takeaways

- Playwright tests verify real user journeys in a real browser
- The test suite is small by design — only critical paths are E2E tested
- Failure artifacts (screenshots, video, trace) make debugging failed tests much easier
- Playwright auto-waits for elements, reducing flakiness

## DJ.ai Connection

Playwright E2E tests verify DJ.ai's critical user flows — onboarding, provider connection, search, and playback. The JSON and JUnit reporters feed into `scripts/test-summary.ps1` alongside Vitest and xUnit results, giving the MOE review process a complete picture of application health.

## Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
