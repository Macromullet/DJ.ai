# Content Security Policy (CSP)

## What Is CSP?

Content Security Policy is an HTTP header that tells the browser **what resources are allowed to load**. It's the most effective defense against Cross-Site Scripting (XSS) because even if an attacker injects a `<script>` tag, the browser blocks it unless the script's source is in the CSP allowlist.

```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://sdk.scdn.co; connect-src 'self' https://api.openai.com
```

## Key Directives

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all resource types | `'self'` |
| `script-src` | JavaScript execution | `'self' https://sdk.scdn.co` |
| `connect-src` | XHR, fetch, WebSocket destinations | `'self' https://api.openai.com` |
| `style-src` | CSS loading | `'self' 'unsafe-inline'` |
| `img-src` | Image sources | `'self' https: data:` |
| `media-src` | Audio/video sources | `'self' blob:` |
| `frame-src` | iframe sources | `'self'` |

## DJ.ai Implementation

DJ.ai sets CSP via Electron's `session.webRequest.onHeadersReceived` API in the main process. The policy is built dynamically by the `buildCSP()` function:

### Source Files

| File | Role |
|------|------|
| `electron-app/electron/validation.cjs` | `buildCSP()` function — constructs the CSP string with allowed sources |
| `electron-app/electron/main.cjs` | Injects CSP header via `session.webRequest.onHeadersReceived` |

### DJ.ai's CSP Policy

The `buildCSP()` function in `validation.cjs` defines allowlists for:

- **script-src**: Spotify Web Playback SDK, Apple MusicKit JS
- **connect-src**: OpenAI API, Anthropic API, Google Generative AI, ElevenLabs, Spotify API, Apple Music API, Azure Functions endpoints
- **style-src**: Includes `'unsafe-inline'` (necessary for React's style injection)

```javascript
// Simplified example of CSP construction
const csp = [
  "default-src 'self'",
  "script-src 'self' https://sdk.scdn.co",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
].join("; ");
```

### Why Session Headers (Not Meta Tags)?

Electron's `session.webRequest` API intercepts every HTTP response and adds the CSP header. This is more secure than `<meta http-equiv="Content-Security-Policy">` because:
1. It applies to **all** requests, not just the initial HTML
2. It can't be modified by renderer-side JavaScript
3. It covers subframes and web workers

## Key Takeaways

- CSP is the strongest XSS defense — it blocks unauthorized scripts even if injected
- Set CSP via `session.webRequest.onHeadersReceived` in Electron (not meta tags)
- Avoid `unsafe-eval` — it defeats the purpose of CSP
- `unsafe-inline` for styles is a pragmatic trade-off for React apps
- Review and minimize your allowlists regularly — every allowed domain is an attack surface

## References

- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Content-Security-Policy.com](https://content-security-policy.com/) — Interactive CSP reference
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
