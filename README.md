# DJ.ai 🎵🤖

An AI-powered music DJ application that provides intelligent commentary, recommendations, and text-to-speech narration across multiple streaming platforms.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![.NET](https://img.shields.io/badge/.NET-8.0-purple.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)

## ✨ Features

- 🎵 **Multi-Platform Support** — Spotify and Apple Music
- 🤖 **AI Commentary** — Intelligent DJ-style commentary using GitHub Copilot or OpenAI
- 🔊 **Text-to-Speech** — Natural voice narration of track info and commentary
- 🔐 **Secure OAuth** — Client secrets in Azure Key Vault, tokens via `safeStorage`
- 🎯 **Smart Recommendations** — AI-powered track suggestions
- ⚡ **Auto-DJ Mode** — Continuous playback with commentary

## 🚀 Quick Start

### Prerequisites

- **.NET 8 SDK** (with Aspire workload: `dotnet workload install aspire`)
- **Node.js 20+**
- **Docker Desktop** (for Redis)

### Get Started

```bash
# 1. Clone
git clone https://github.com/Macromullet/DJ.ai.git
cd DJ.ai

# 2. Configure secrets: interactive guided setup
.\setup.ps1 --local

# 3. Start everything (Aspire)
dotnet run --project DJai.AppHost

# 4. Open http://localhost:5173 and connect your music service!
#    Dashboard at https://localhost:15888
```

See [DEV_SETUP.md](DEV_SETUP.md) for complete setup instructions.

## 🏗️ Architecture

**Electron App** → React 18 + TypeScript + Vite  
**OAuth Proxy** → .NET 8 Azure Functions + Key Vault + Redis  
**Orchestration** → .NET Aspire (dev), Bicep + `azd` (prod)  
**CI/CD** → GitHub Actions (build, deploy, release)  
**AI** → GitHub Copilot API + OpenAI API  
**Music** → Spotify Web API, Apple Music API

The OAuth proxy handles **only** token exchange — all music API calls go directly from the Electron app to providers. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [DEV_SETUP.md](DEV_SETUP.md) | Local development setup |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design decisions |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Azure with `azd` |
| [docs/RELEASING.md](docs/RELEASING.md) | Release process (backend + Electron) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute |

## 🎯 Current Status

✅ **Working:** Spotify, Apple Music providers, OAuth flow, Aspire dev environment  
✅ **Deployed:** GitHub Actions CI/CD, Bicep infrastructure, `azd` deployment  
✅ **Secured:** CSP, safeStorage, `djai://` protocol, Redis-backed rate limiting  
🚧 **In Progress:** AI commentary, TTS narration  
📋 **Planned:** GPU visualizations, Playlist management

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License — see [LICENSE](LICENSE) file for details.

---

**Made with ❤️ by [Macromullet](https://github.com/Macromullet)**
