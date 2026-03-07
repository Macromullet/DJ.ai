# React Router DOM

> Client-side routing for single-page applications — handling navigation and OAuth callbacks in DJ.ai.

React Router DOM provides declarative routing for React SPAs. In DJ.ai, routing is used primarily for one critical purpose: **handling OAuth callback redirects**. When a user authenticates with a music provider (Spotify, YouTube, Apple Music), the OAuth flow redirects back to the app at `/oauth/callback` with an authorization code. React Router captures this route and renders the `OAuthCallback` component to process the code exchange.

---

## Why DJ.ai Uses React Router

1. **OAuth callbacks** — the `/oauth/callback` route processes authorization codes from music providers
2. **Deep linking** — Electron's custom protocol (`djai://`) can map to React routes
3. **Future extensibility** — additional routes for settings pages, playlists, etc.
4. **SPA navigation** — no full page reloads when moving between views

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Routing Basics](./routing-basics.md) | Routes, params, navigation |
| 2 | [OAuth Callbacks](./oauth-callbacks.md) | Handling auth redirects in SPAs |

---

## 🔗 DJ.ai Connection

| File | React Router Usage |
|------|-------------------|
| `electron-app/src/App.tsx` | `BrowserRouter`, `Routes`, `Route` — defines the route tree |
| `electron-app/src/components/OAuthCallback.tsx` | Renders at `/oauth/callback`, extracts `code` and `state` params |

---

## 📖 Resources

- [React Router Documentation](https://reactrouter.com/en/main) — Official docs
- [Getting Started](https://reactrouter.com/en/main/start/overview) — Quick start guide
