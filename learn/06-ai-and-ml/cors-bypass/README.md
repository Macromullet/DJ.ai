# CORS Bypass via Electron IPC Proxy

## The Problem

When DJ.ai's renderer process (running in Chromium) tries to call external APIs directly, the browser blocks it:

```javascript
// ❌ This fails in the renderer:
fetch('https://api.openai.com/v1/chat/completions', { ... })
// → CORS error: No 'Access-Control-Allow-Origin' header
```

**Why?** The Same-Origin Policy prevents JavaScript on `http://localhost:5173` from reading responses from `https://api.openai.com`. OpenAI's servers don't include `Access-Control-Allow-Origin: http://localhost:5173` in their responses — and they shouldn't, because that would let any website call the API with a user's credentials.

## The Solution: IPC Proxy

Electron's main process runs Node.js, which is **not subject to browser CORS restrictions**. DJ.ai routes all AI API calls through the main process:

```
┌───────────────────────┐       IPC        ┌───────────────────────┐
│  Renderer (Chromium)  │ ───────────────► │  Main Process (Node)  │
│                       │                  │                       │
│  "Please fetch this   │                  │  1. Validate URL      │
│   URL for me"         │                  │  2. fetch() to API    │
│                       │ ◄─────────────── │  3. Return response   │
│  Gets the response    │       IPC        │                       │
└───────────────────────┘                  └───────────────────────┘
```

### Two IPC Handlers

| Handler | Purpose | Response Type |
|---------|---------|---------------|
| `ai-api-request` | Text API calls (chat completions) | JSON body |
| `ai-tts-request` | TTS API calls (audio generation) | Base64-encoded binary |

## DJ.ai Implementation

### Renderer Side (Request)

```typescript
// Using the IPC proxy exposed via preload
const response = await window.electron.aiProxy.request({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ model: 'gpt-4o-mini', messages: [...] }),
});

// response: { ok: boolean, status: number, statusText: string, body: string }
```

### Main Process Side (Proxy)

```javascript
// electron-app/electron/main.cjs — Simplified
ipcMain.handle('ai-api-request', async (event, options) => {
  // 1. VALIDATE: Is the URL in the allowlist?
  if (!isAllowedAIHost(options.url)) {
    return { ok: false, status: 403, body: 'URL not allowed' };
  }

  // 2. FETCH: Main process is not subject to CORS
  const response = await fetch(options.url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });

  // 3. RETURN: Send response back to renderer via IPC
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
});
```

### Source Files

| File | Role |
|------|------|
| `electron-app/electron/main.cjs` | IPC handlers: `ai-api-request` (JSON), `ai-tts-request` (binary) |
| `electron-app/electron/preload.cjs` | Exposes `aiProxy.request()` and `aiProxy.ttsRequest()` |
| `electron-app/electron/validation.cjs` | `isAllowedAIHost()` — URL validation against allowlist |
| `electron-app/src/types/electron.d.ts` | TypeScript types for the IPC proxy API |

### Security: Why Not Just Disable CORS?

Electron allows disabling web security (`webSecurity: false`), but this is **extremely dangerous**:

```javascript
// ❌ NEVER DO THIS — disables ALL browser security
new BrowserWindow({ webPreferences: { webSecurity: false } });
```

Instead, DJ.ai's IPC proxy approach:
- ✅ Validates every URL against an allowlist
- ✅ Rejects userinfo SSRF bypasses
- ✅ Enforces HTTPS only
- ✅ Limits TTS response size (10 MB)
- ✅ Keeps renderer sandboxed with full browser security

## Key Takeaways

- Browser CORS blocks renderer → external API calls by design
- Electron's main process (Node.js) is not subject to CORS
- Route API calls through IPC: renderer → main process → API → main process → renderer
- **Always validate URLs** in the IPC proxy — it's the SSRF attack surface
- Never disable `webSecurity` — use the IPC proxy pattern instead
- Separate handlers for JSON (text API) and binary (TTS API) responses

## References

- [MDN — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Electron — IPC Main](https://www.electronjs.org/docs/latest/api/ipc-main)
- [Electron Security — Don't Disable webSecurity](https://www.electronjs.org/docs/latest/tutorial/security#6-do-not-disable-websecurity)
