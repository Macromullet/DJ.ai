# 08 — Testing

## Overview

DJ.ai has **537 tests** across three test suites: **414 frontend tests** (Vitest + React Testing Library), **123 backend tests** (xUnit + Moq + FluentAssertions), and **8 Playwright E2E specs**. But the number is less important than the philosophy: every test must answer "yes" to one question:

> **"If I introduced a bug in the source code, would this test catch it?"**

Tests that only verify mocks are tautological — they pass even when the code is broken. DJ.ai's anti-tautology philosophy, validated through multi-model (MOE) test reviews, found **6 real bugs** by asking this question systematically.

## Test Suite Summary

| Suite | Framework | Count | Config File |
|-------|-----------|-------|-------------|
| Frontend unit/component | Vitest + RTL | 414 | `electron-app/vitest.config.ts` |
| Backend unit | xUnit + Moq + FluentAssertions | 123 | `oauth-proxy.Tests/` |
| E2E | Playwright | 8 specs | `electron-app/playwright.config.ts` |

## Running Tests

```bash
# Frontend (Vitest)
cd electron-app
npm test                    # Run all unit tests
npm run test:coverage       # Run with coverage report
npm run test:failures       # Agent-friendly failure output

# Backend (xUnit)
cd oauth-proxy.Tests
dotnet test                 # Run all backend tests

# E2E (Playwright)
cd electron-app
npm run test:e2e            # Requires app running on :5173

# Aggregate results
.\scripts\test-summary.ps1  # Combines all suite results into summary.json
```

## Learning Path

### Philosophy (Start Here)
1. **[Anti-Tautology Testing](./philosophy/anti-tautology.md)** — The core principle
2. **[Test Pyramid](./philosophy/test-pyramid.md)** — Unit → Integration → E2E balance
3. **[Coverage vs. Quality](./philosophy/coverage-vs-quality.md)** — Why meaningful coverage beats 95%

### Frontend Testing
4. **[Vitest](./vitest/)** — Setup, mocking, async patterns, coverage
5. **[React Testing Library](./react-testing-library/)** — Queries, user events, render patterns
6. **[Playwright](./playwright/)** — E2E setup, selectors, assertions

### Backend Testing
7. **[xUnit](./xunit/)** — Fundamentals, Moq, FluentAssertions

### Patterns
8. **[Mock Patterns](./mock-patterns/)** — Test doubles, fixtures, DI for testing
9. **[Feedback Loop](./feedback-loop/)** — Machine-readable output for agent reviews

## Key Takeaways

- Quality over quantity: 50% meaningful coverage beats 95% tautological coverage
- Every test should fail when its corresponding source code is broken
- Machine-readable output (`summary.json`) enables AI agent test reviews
- DI containers (`container.ts`, `Program.cs`) make both frontend and backend fully testable

## DJ.ai Connection

Testing is central to DJ.ai's development workflow. The Mixture-of-Experts (MOE) review process includes test review as a first-class concern — multiple AI models review test quality in parallel, checking for tautological tests, missing edge cases, and assertion quality. The `scripts/test-summary.ps1` script aggregates results into a format optimized for agent consumption.

## Further Reading

- [Vitest Documentation](https://vitest.dev/guide/)
- [React Testing Library](https://testing-library.com/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [xUnit.net Documentation](https://xunit.net/docs/getting-started/netcore/cmdline)
