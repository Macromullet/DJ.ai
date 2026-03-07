# Conventional Commits

## The Concept

**Conventional Commits** is a specification for writing structured commit messages. Each message follows a standard format that makes the git history readable, enables automated tooling (changelogs, version bumps), and communicates the *type* of change at a glance.

### Format

```
<type>(<optional scope>): <description>

<optional body>

<optional footer>
```

### Common Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat:` | New feature | `feat: add Spotify provider` |
| `fix:` | Bug fix | `fix: prevent OAuth token race condition` |
| `docs:` | Documentation | `docs: update ARCHITECTURE.md` |
| `refactor:` | Code restructuring | `refactor: extract IMusicProvider interface` |
| `test:` | Adding tests | `test: add Playwright E2E for onboarding` |
| `chore:` | Maintenance | `chore: update dependencies` |
| `style:` | Formatting | `style: fix indentation in tokens.css` |
| `perf:` | Performance | `perf: optimize TTS audio pre-caching` |
| `ci:` | CI/CD changes | `ci: add matrix build for Electron` |

### Breaking Changes

Use `!` after the type or a `BREAKING CHANGE:` footer:

```
feat!: redesign OAuth callback handling

BREAKING CHANGE: OAuth callback URL changed from /callback to /oauth/callback.
All provider configurations must be updated.
```

### Scope (Optional)

Narrow the change to a specific area:

```
feat(onboarding): add provider selection wizard
fix(tts): handle empty audio response from Gemini
refactor(oauth): extract token refresh into shared utility
```

## How DJ.ai Uses Conventional Commits

All commits in DJ.ai use conventional format. Since the project uses **squash merging**, the PR title becomes the squash commit message — so PR titles also follow the convention:

```
PR Title: feat: add onboarding wizard with provider selection
  ↓ squash merge
Commit: feat: add onboarding wizard with provider selection
```

### Real Examples from DJ.ai

```bash
feat: implement YouTube Music OAuth flow
fix: handle expired token refresh in Electron IPC bridge
docs: add DEV_SETUP.md with local development instructions
refactor: migrate from inline styles to design token system
chore: configure Aspire orchestration for local development
ci: add multi-platform Electron packaging to CI workflow
```

### Co-authored-by Trailer

When AI agents contribute code, the commit includes a trailer:

```
feat: add rate limiting to device authentication

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## DJ.ai Connection

Conventional commits are a team practice in DJ.ai, not enforced by tooling. Every PR title follows the format, which becomes the squash commit message on `main`. This produces a git log that reads like a changelog — you can scan `main` history and immediately understand what changed, when, and why.

## Key Takeaways

- Conventional commits communicate change type at a glance
- PR titles should match conventional commit format (they become the squash message)
- Use scope for precision: `fix(oauth)` vs `fix(tts)` vs `fix(ui)`
- Include `Co-authored-by` trailers for AI-assisted commits

## Further Reading

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)
- [Conventional Commits Cheatsheet](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716)
