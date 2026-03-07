# CORS — Cross-Origin Resource Sharing

## What Is the Same-Origin Policy?

Browsers enforce the **Same-Origin Policy**: JavaScript on `http://localhost:5173` cannot read responses from `http://localhost:7071` because they have different ports (different origins). An origin is defined by `scheme + host + port`.

```
http://localhost:5173  ≠  http://localhost:7071   (different port)
http://localhost:5173  ≠  https://localhost:5173  (different scheme)
http://localhost:5173  =  http://localhost:5173   (same origin ✓)
```

## What Is CORS?

CORS is a mechanism that **relaxes** the Same-Origin Policy in a controlled way. The server sends headers telling the browser: "It's OK for requests from these origins to read my responses."

### The CORS Flow

```
Browser (localhost:5173)                Server (localhost:7071)
        │                                       │
        │  OPTIONS /oauth/spotify/initiate      │  ← Preflight request
        │  Origin: http://localhost:5173         │
        │──────────────────────────────────────►│
        │                                       │
        │  Access-Control-Allow-Origin: *        │  ← Server says OK
        │  Access-Control-Allow-Methods: POST    │
        │◄──────────────────────────────────────│
        │                                       │
        │  POST /oauth/spotify/initiate         │  ← Actual request
        │──────────────────────────────────────►│
        │                                       │
        │  200 OK + response body               │
        │◄──────────────────────────────────────│
```

### Key Headers

| Header | Set By | Purpose |
|--------|--------|---------|
| `Origin` | Browser | Tells server where the request came from |
| `Access-Control-Allow-Origin` | Server | Which origins can read responses |
| `Access-Control-Allow-Methods` | Server | Which HTTP methods are allowed |
| `Access-Control-Allow-Headers` | Server | Which custom headers are allowed |

## DJ.ai Implementation

DJ.ai has CORS configured in the OAuth proxy to allow the Vite dev server to call the Azure Functions backend:

| File | Role |
|------|------|
| `oauth-proxy/host.json` | Azure Functions host configuration |
| `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` | Handles requests from localhost origins |

### Development CORS Policy

In development, the OAuth proxy allows requests from `localhost:5173` through `localhost:5177` (Vite auto-increments ports when 5173 is busy). In production, CORS is configured in Azure Functions to allow only the deployed Electron app's origin.

### Why the IPC Proxy Bypasses CORS

AI API calls (OpenAI, Anthropic, ElevenLabs) would be blocked by CORS because those servers don't include DJ.ai in their `Access-Control-Allow-Origin` header. DJ.ai solves this by routing requests through the Electron main process:

```
Renderer → IPC → Main Process → fetch(api.openai.com) → IPC → Renderer
```

The main process isn't subject to CORS because it's Node.js, not a browser context. See [cors-bypass/README.md](../../06-ai-and-ml/cors-bypass/README.md) for details.

## Key Takeaways

- CORS protects users by preventing unauthorized cross-origin data reads
- The **server** decides who can access its resources via response headers
- Preflight `OPTIONS` requests check permissions before the actual request
- Electron's main process bypasses CORS — use it for APIs that don't allow your origin
- Never use `Access-Control-Allow-Origin: *` with credentials

## References

- [MDN — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [web.dev — Cross-Origin Resource Sharing](https://web.dev/articles/cross-origin-resource-sharing)
- [OWASP CORS Misconfiguration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing)
