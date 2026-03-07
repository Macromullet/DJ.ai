# ADR: Why No API Proxy

## Status

Accepted

## Context

When building an application that integrates with third-party APIs (YouTube, Spotify, Apple Music), a common pattern is to route all API requests through your backend. This "full proxy" approach has the backend call the provider API on behalf of the client.

DJ.ai explicitly rejects this pattern. The question: **should the backend proxy music API requests, or should the client call providers directly?**

## Decision

The client calls music provider APIs **directly** using OAuth access tokens. The backend handles **only** token operations (initiate, exchange, refresh).

## The Three Arguments

### 1. Performance: No Extra Hop

Every proxied request adds latency:

```
Full proxy path:
  Client → Azure Functions → YouTube API → Azure Functions → Client
  Added latency: ~50-200ms (two extra network hops)

Direct path (DJ.ai):
  Client → YouTube API → Client
  Added latency: 0ms
```

For a music app, latency matters. Search results should feel instant. Track transitions shouldn't have noticeable delays.

### 2. Cost: No Compute Per API Call

Azure Functions charge per execution (~$0.20 per million executions) and per GB-second of compute. With a full proxy:

```
Per user session (estimated):
  10 searches × 1 request         = 10 API calls
  50 tracks × 2 requests each     = 100 API calls
  Recommendations, top tracks     = 20 API calls
  Total: ~130 proxied requests

With OAuth-only:
  1 initiate + 1 exchange + ~2 refreshes = 4 requests
```

That's a **97% reduction** in backend compute.

### 3. Simplicity: 3 Endpoints, Not 30

A full proxy mirrors the provider's API surface:

```
Full proxy endpoints needed:
  /api/search, /api/track/{id}, /api/playlist/{id},
  /api/recommendations, /api/top-tracks, /api/play,
  /api/pause, /api/queue, /api/devices, /api/user/profile...
  (Each provider adds its own set)

OAuth-only endpoints (DJ.ai):
  /oauth/{provider}/initiate
  /oauth/{provider}/exchange
  /oauth/{provider}/refresh
  (3 per provider, ~9 total)
```

### Why Is This Safe?

The concern with direct client calls is usually **protecting API keys**. But OAuth separates two types of credentials:

| Credential | Where It Lives | Security |
|-----------|---------------|----------|
| **Client Secret** | Backend (Key Vault) | Never exposed — used only for token exchange |
| **Access Token** | Client (localStorage) | Safe to expose — scoped to user, short-lived, revocable |

The access token is *designed* to be held by the client. That's the entire point of OAuth — delegated authorization without sharing the client secret.

## Consequences

**Positive:**
- Faster API responses (no proxy latency)
- Lower backend costs (97% fewer function invocations)
- Simpler backend (9 endpoints vs 30+)
- Easier to add new providers (only OAuth endpoints needed)

**Negative:**
- Client must handle API errors directly (no backend error normalization)
- Can't add server-side caching for expensive API calls
- Rate limiting must happen at the provider level, not our backend

## DJ.ai Connection

This decision shapes the entire architecture. The `oauth-proxy/` backend is intentionally minimal — three endpoints per provider. The `electron-app/src/providers/` directory contains all the API integration logic. `YouTubeMusicProvider.ts` makes direct calls to `googleapis.com` using stored OAuth tokens. This is the first thing to understand before reading the codebase.

## Further Reading

- [OAuth.net: OAuth for Native Apps](https://oauth.net/articles/authentication/)
- [IETF: OAuth for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)
- [Auth0: Which OAuth Flow to Use](https://auth0.com/docs/get-started/authentication-and-authorization-flow/which-oauth-2-0-flow-should-i-use)
