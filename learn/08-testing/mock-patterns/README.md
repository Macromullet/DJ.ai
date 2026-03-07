# Mock Patterns

## Overview

Test doubles are objects that stand in for real dependencies during testing. Choosing the right type of double — and placing it at the right boundary — is the difference between meaningful tests and tautological ones.

This section covers the five types of test doubles, DJ.ai's fixture patterns, and how dependency injection enables the entire testing strategy.

## Learning Path

| Topic | File | What You'll Learn |
|-------|------|-------------------|
| [Test Doubles](./test-doubles.md) | Types of fakes | Dummy, Stub, Spy, Mock, Fake — when to use each |
| [Fixtures](./fixtures.md) | Test data and setup | Shared fixtures, setup patterns, audio test files |
| [DI for Testing](./dependency-injection-for-testing.md) | Making code testable | Interface-based design enables test doubles |

## Key Principle

> **Mock at the boundary, not at the core.**

External systems (HTTP APIs, Key Vault, Redis, browser Audio) are boundaries — mock them. Internal logic (mapping functions, validation, state management) is the core — test it for real.

```
                    ┌─────────────────────┐
  Mock these ──────►│   HTTP (fetch)      │
  boundaries        │   Azure Key Vault   │
                    │   Redis / Cache     │
                    │   Browser Audio     │
                    │   window.electron   │
                    └─────────────────────┘

                    ┌─────────────────────┐
  Test this ───────►│   OAuth logic       │
  real code         │   Token mapping     │
                    │   Search mapping    │
                    │   Validation rules  │
                    │   Error handling    │
                    └─────────────────────┘
```

## DJ.ai's Test Double Inventory

### Frontend (Vitest)

| Double | Type | Mocks What |
|--------|------|-----------|
| `vi.mocked(fetch)` | Stub | HTTP boundary |
| `window.electron` | Fake | Electron IPC bridge |
| `Audio` constructor | Stub | Browser audio playback |
| `SpeechSynthesis` | Stub | Browser TTS |
| `localStorage` | Fake | Browser storage (in-memory dictionary) |
| `MockTTSService` | Spy + Stub | TTS service with call tracking |
| `MockAICommentaryService` | Spy + Stub | AI service with call tracking |

### Backend (xUnit + Moq)

| Double | Type | Mocks What |
|--------|------|-----------|
| `MockSecretService` | Fake | Azure Key Vault (real dictionary) |
| `TestHttpMessageHandler` | Stub | HTTP responses from OAuth providers |
| `Mock<IDatabase>` | Mock | Redis operations |
| `Mock<IConnectionMultiplexer>` | Mock | Redis connection |
| `Mock<IDeviceAuthService>` | Mock | Device token validation |
| `Mock<IStateStoreService>` | Mock | CSRF state management |

## Key Takeaways

- Five types of test doubles exist, each with different strengths
- DJ.ai uses all five types strategically across frontend and backend
- The boundary principle prevents tautological tests
- DI containers (both frontend and backend) make swapping doubles trivial

## DJ.ai Connection

DJ.ai's mock patterns are designed for the anti-tautology principle: mock the boundaries (where bugs can't be tested), test the logic (where bugs actually live). The `MockSecretService` is a great example — it's a real dictionary that implements `ISecretService`, behaving like Key Vault without the network calls.
