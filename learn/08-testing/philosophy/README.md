# Testing Philosophy

## Overview

DJ.ai's testing philosophy prioritizes **bug-catching ability** over test count or coverage percentage. A test suite is valuable only if it catches real bugs — and every test in the suite should earn its place by answering "yes" to this question:

> **"If I introduced a bug in the source code, would this test catch it?"**

This section covers the three pillars of DJ.ai's testing philosophy:

## Pillars

### 1. [Anti-Tautology Testing](./anti-tautology.md)

The core principle: tests that verify mocks instead of source code are worthless. They always pass — even when the code is broken. DJ.ai's MOE review process systematically identifies and eliminates tautological tests.

### 2. [Test Pyramid](./test-pyramid.md)

The right balance of unit, integration, and E2E tests. Most bugs are caught cheaply by unit tests; E2E tests verify critical user journeys. DJ.ai's distribution: 414 unit, component integration, and 8 E2E specs.

### 3. [Coverage vs. Quality](./coverage-vs-quality.md)

Why 50% meaningful coverage beats 95% tautological coverage. Coverage metrics measure lines executed, not bugs detected. DJ.ai sets thresholds at 70% with quality enforcement via MOE reviews.

## The MOE Review Process

DJ.ai uses Mixture-of-Experts (MOE) reviews where multiple AI models review tests in parallel, each focusing on different concerns:

- **Model A** reviews test structure and anti-tautology compliance
- **Model B** reviews edge cases and error handling coverage
- **Model C** reviews assertion quality and mock usage

This process found **6 real bugs** in DJ.ai's codebase — bugs that the original tests missed because they were testing mocks instead of behavior.

## Key Principles

1. **Failing tests that expose real bugs are successes**, not failures
2. **Delete tests that can't catch bugs** — they add maintenance cost without value
3. **Test behavior, not implementation** — what the code does, not how it does it
4. **Mock boundaries, not internals** — mock external services, not internal functions

## DJ.ai Connection

These principles govern every test added to DJ.ai. Code review (whether human or agent) includes test review — checking that new tests actually validate source code behavior and would break if a bug were introduced.
