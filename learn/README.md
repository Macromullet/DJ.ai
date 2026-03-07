# 🎓 DJ.ai Learning Curriculum

> Learn every technology powering DJ.ai — from TypeScript fundamentals to GPU-accelerated audio visualization.

DJ.ai is an AI-powered music DJ built with **Electron + React + .NET Azure Functions**, orchestrated by **.NET Aspire**. This curriculum walks you through every layer of the stack, from language foundations to advanced architecture patterns.

---

## 🗺️ Learning Path

Follow the modules in order for a structured journey, or jump to any section relevant to your goals.

```
  ┌─────────────────────────────────────────────────────┐
  │  01 Foundations (TypeScript, C#, JS, Node.js)        │
  │  ↓                                                   │
  │  02 Frontend (React, Vite, Web APIs)                 │
  │  ↓                                                   │
  │  03 Electron (Main/Renderer, IPC, Packaging)         │
  │  ↓                                                   │
  │  04 Backend (.NET, Azure Functions, Key Vault)       │
  │  ↓                                                   │
  │  05 Security (OAuth, CSP, Secret Management)         │
  │  ↓                                                   │
  │  06 AI & ML (LLM Commentary, TTS, Prompt Design)    │
  │  ↓                                                   │
  │  07 Music APIs (YouTube, Spotify, Apple Music)       │
  │  ↓                                                   │
  │  08 Testing (Vitest, Playwright, xUnit)              │
  │  ↓                                                   │
  │  09 Design System (Tokens, Accessibility, CSS)       │
  │  ↓                                                   │
  │  10 DevOps (CI/CD, Aspire, Azure Deployment)         │
  │  ↓                                                   │
  │  11 Architecture (DI, Provider Pattern, State)       │
  │  ↓                                                   │
  │  12 Advanced (WebGL Viz, Streaming, Performance)     │
  └─────────────────────────────────────────────────────┘
```

---

## ⏱️ Time Estimates

| Module | Beginner | Experienced |
|--------|----------|-------------|
| [01 — Foundations](./01-foundations/README.md) | 12–16 hrs | 3–4 hrs |
| [02 — Frontend](./02-frontend/README.md) | 10–14 hrs | 3–4 hrs |
| [03 — Electron](./03-electron/README.md) | 8–10 hrs | 2–3 hrs |
| [04 — Backend](./04-backend/README.md) | 8–10 hrs | 2–3 hrs |
| [05 — Security](./05-security/README.md) | 6–8 hrs | 2–3 hrs |
| [06 — AI & ML](./06-ai-and-ml/README.md) | 8–10 hrs | 3–4 hrs |
| [07 — Music APIs](./07-music-apis/README.md) | 6–8 hrs | 2–3 hrs |
| [08 — Testing](./08-testing/README.md) | 6–8 hrs | 2–3 hrs |
| [09 — Design System](./09-design-system/README.md) | 4–6 hrs | 1–2 hrs |
| [10 — DevOps](./10-devops/README.md) | 8–10 hrs | 2–3 hrs |
| [11 — Architecture](./11-architecture/README.md) | 6–8 hrs | 2–3 hrs |
| [12 — Advanced](./12-advanced/README.md) | 10–14 hrs | 4–6 hrs |
| **Total** | **~92–122 hrs** | **~28–41 hrs** |

---

## 📋 Prerequisites

Before starting this curriculum, you should have:

- **Basic programming experience** in any language (variables, loops, functions, classes)
- **Git fundamentals** — clone, branch, commit, push, pull request
- **A code editor** — VS Code recommended (with ESLint, Prettier, C# extensions)
- **Node.js 18+** and **npm** installed
- **.NET 8 SDK** installed (for backend modules)
- **Curiosity** — each module links to official docs for deep dives

---

## 📚 Table of Contents

### [01 — Foundations](./01-foundations/README.md)
Languages and runtimes powering DJ.ai: TypeScript, C#, JavaScript, and Node.js.
- [TypeScript](./01-foundations/typescript/README.md) — Type system, generics, interfaces, async patterns
- [C#](./01-foundations/csharp/README.md) — Async/await, dependency injection, records & patterns
- [JavaScript](./01-foundations/javascript/README.md) — ES modules vs CommonJS, closures, event loop
- [Node.js](./01-foundations/nodejs/README.md) — Package management, streams & buffers

### [02 — Frontend](./02-frontend/README.md)
React 19, Vite, React Router, and browser APIs used in the renderer process.
- [React](./02-frontend/react/README.md) — Hooks, component patterns, state management, error boundaries
- [React Router](./02-frontend/react-router/README.md) — Client-side routing and OAuth callbacks
- [Vite](./02-frontend/vite/README.md) — Dev server, build optimization, configuration
- [Web APIs](./02-frontend/web-apis/README.md) — Web Audio, Web Speech, Blob URLs, localStorage

### [03 — Electron](./03-electron/README.md)
Desktop application shell: main process, renderer, IPC, and packaging.

### [04 — Backend](./04-backend/README.md)
.NET 8 Azure Functions for OAuth token exchange, Key Vault, and Aspire orchestration.

### [05 — Security](./05-security/README.md)
OAuth 2.0 flows, Content Security Policy, device tokens, and secret management.

### [06 — AI & ML](./06-ai-and-ml/README.md)
LLM-powered DJ commentary (OpenAI, Anthropic, Copilot), text-to-speech services, and prompt engineering.

### [07 — Music APIs](./07-music-apis/README.md)
YouTube Data API, Spotify Web API, Apple MusicKit JS — authentication, search, playback.

### [08 — Testing](./08-testing/README.md)
Vitest for unit tests, Playwright for E2E, xUnit for .NET, and testing strategies.

### [09 — Design System](./09-design-system/README.md)
CSS custom properties, design tokens, utility classes, accessibility (WCAG AA).

### [10 — DevOps](./10-devops/README.md)
GitHub Actions CI/CD, .NET Aspire orchestration, Azure deployment, and release flow.

### [11 — Architecture](./11-architecture/README.md)
Provider pattern, dependency injection, OAuth-only middle tier, and state management.

### [12 — Advanced](./12-advanced/README.md)
WebGL visualization with Three.js, streaming audio, performance optimization, and GPU computing.

---

## 🏗️ How to Use This Curriculum

1. **Read the module README** — each one explains what you'll learn and links to subtopics
2. **Study the concept** — each topic file explains the technology with official doc links
3. **Find it in DJ.ai** — every file has a "DJ.ai Connection" section referencing real code
4. **Experiment** — modify the codebase, break things, fix them
5. **Build something** — the best way to learn is to extend DJ.ai with a new feature

---

## 🔗 DJ.ai Documentation

| Document | Purpose |
|----------|---------|
| [DEV_SETUP.md](../DEV_SETUP.md) | Local development setup |
| [ARCHITECTURE.md](../docs/ARCHITECTURE.md) | System architecture |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Contribution guidelines |
| [DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Azure deployment guide |

---

*Built with ❤️ to help every contributor understand the full DJ.ai stack.*
