# Routing Basics

> Routes, parameters, and navigation — how React Router maps URLs to components.

React Router maps URL paths to React components. When the URL changes, React Router renders the matching component — no full page reload. DJ.ai uses this to distinguish between the main app view and the OAuth callback handler, ensuring that when a music provider redirects back with an authorization code, the right component processes it.

---

## Core Concepts

### Setting Up Routes

DJ.ai wraps the app in `BrowserRouter` and defines routes with `Routes` and `Route`:

```typescript
// From electron-app/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="*" element={<MainApp />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- **`/oauth/callback`** — Matches the OAuth redirect URL; renders `OAuthCallback`
- **`*`** — Wildcard catch-all; renders the main DJ.ai interface

### Route Parameters

React Router supports dynamic segments in URLs:

```typescript
// Dynamic route with parameter
<Route path="/track/:trackId" element={<TrackDetail />} />

// Accessing the parameter in the component
import { useParams } from 'react-router-dom';

function TrackDetail() {
  const { trackId } = useParams<{ trackId: string }>();
  // Fetch and display track with this ID
}
```

While DJ.ai doesn't currently use route params, the pattern is valuable for future features like direct track linking.

### Navigation

React Router provides `useNavigate` for programmatic navigation:

```typescript
import { useNavigate } from 'react-router-dom';

function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      // Process OAuth code...
      // Then redirect to the main app
      navigate('/', { replace: true });
    }
    handleCallback();
  }, [navigate]);
}
```

The `replace: true` option replaces the callback URL in history — so pressing "Back" doesn't return to the callback route.

### Query Parameters

`useSearchParams` reads URL query parameters — essential for OAuth callbacks:

```typescript
import { useSearchParams } from 'react-router-dom';

function OAuthCallback() {
  const [searchParams] = useSearchParams();

  const code = searchParams.get('code');   // Authorization code
  const state = searchParams.get('state'); // CSRF protection state
  const error = searchParams.get('error'); // OAuth error (if any)
}
```

### BrowserRouter vs HashRouter

| Router | URL Format | Use Case |
|--------|-----------|----------|
| `BrowserRouter` | `/oauth/callback` | Web apps, Electron (with proper setup) |
| `HashRouter` | `/#/oauth/callback` | Static file hosting, simpler Electron setup |

DJ.ai uses `BrowserRouter` because Vite's dev server handles all routes, and Electron loads from `localhost:5173` in development (or `file://` with proper configuration in production).

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Defines the route tree with `BrowserRouter`, `Routes`, and `Route`; the wildcard `*` route renders the main app
- **`electron-app/src/components/OAuthCallback.tsx`** — Mounted at `/oauth/callback`; uses `useSearchParams` to extract `code` and `state` from the redirect URL
- **`electron-app/electron/main.cjs`** — Opens OAuth flow in a popup window that redirects to `http://localhost:5173/oauth/callback`
- **`electron-app/vite.config.ts`** — Vite's dev server serves all routes (SPA fallback) so React Router can handle them

---

## 🎯 Key Takeaways

- React Router maps **URL paths to components** without full page reloads
- DJ.ai defines two routes: `/oauth/callback` (OAuth handler) and `*` (main app)
- **`useSearchParams`** extracts query parameters like `code` and `state` from OAuth redirects
- **`useNavigate`** with `replace: true` redirects after OAuth without polluting browser history
- **`BrowserRouter`** is the standard choice for Electron + Vite apps

---

## 📖 Resources

- [React Router Overview](https://reactrouter.com/en/main/start/overview) — Getting started guide
- [Route](https://reactrouter.com/en/main/route/route) — Route component API
- [useNavigate](https://reactrouter.com/en/main/hooks/use-navigate) — Programmatic navigation
- [useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params) — Query parameter access
- [useParams](https://reactrouter.com/en/main/hooks/use-params) — Route parameter access
