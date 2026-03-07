# 11 — Architecture

## Why Architecture Matters

Software architecture is the set of **high-level decisions** that shape how a system is structured, how components communicate, and how it evolves over time. Good architecture makes the right things easy and the wrong things hard. Bad architecture makes everything hard.

Architecture decisions include:
- Where does logic live? (Client vs server vs serverless)
- How do components communicate? (REST, IPC, events)
- What patterns enforce consistency? (Interfaces, DI, feature flags)
- What tradeoffs are we making? (Performance vs simplicity, cost vs flexibility)

## DJ.ai's Architecture Overview

DJ.ai is a **three-layer application** with a distinctive "OAuth-only middle tier" pattern:

```
┌─────────────────────────────────────────────┐
│  Electron App (React + TypeScript + Vite)    │
│  ├── UI Components                           │
│  ├── Music Providers (IMusicProvider)         │
│  ├── AI Services (commentary, TTS)           │
│  └── Direct API calls to music platforms     │
├─────────────────────────────────────────────┤
│  OAuth Proxy (.NET Azure Functions)           │
│  ├── /initiate — Build OAuth URL             │
│  ├── /exchange — Code → tokens               │
│  └── /refresh — Refresh expired tokens       │
├─────────────────────────────────────────────┤
│  Music Providers (Spotify, Apple Music)         │
│  └── Client calls these DIRECTLY             │
└─────────────────────────────────────────────┘
```

**Key insight:** The backend exists solely to protect client secrets. All music API calls go directly from the Electron app to the provider — no API proxying.

## Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Patterns](./patterns/) | Design patterns used throughout the codebase |
| 2 | [Decisions](./decisions/) | Why Electron? Why Azure Functions? Why no proxy? |
| 3 | [Audio](./audio/) | PCM/WAV conversion, audio playback, memory management |

## Key Takeaways

- Architecture decisions have long-lasting consequences — document the *why*, not just the *what*
- The "OAuth-only middle tier" pattern is DJ.ai's core architectural insight
- Interface-based design (IMusicProvider) enables multi-provider support
- Every decision involves tradeoffs — understanding them prevents regret

## Further Reading

- [Martin Fowler: Software Architecture Guide](https://martinfowler.com/architecture/)
- [C4 Model for Software Architecture](https://c4model.com/)
- [The Architecture of Open Source Applications](https://aosabook.org/en/)
