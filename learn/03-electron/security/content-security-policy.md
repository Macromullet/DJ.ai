# Content Security Policy (CSP)

## What Is CSP?

Content Security Policy is an HTTP header that tells the browser which resources (scripts, styles, images, connections) a page is allowed to load. It's one of the most effective defenses against **Cross-Site Scripting (XSS)** attacks — even if an attacker injects a script tag, CSP can prevent it from executing.

In Electron, CSP is especially important because your app loads web content that has access (through the preload bridge) to native capabilities.

## CSP Directives

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all resource types | `'self'` |
| `script-src` | JavaScript execution | `'self' 'unsafe-inline'` |
| `connect-src` | Fetch/XHR/WebSocket targets | `https://api.openai.com` |
| `media-src` | Audio/video sources | `https://music.youtube.com` |
| `img-src` | Image loading | `https: data:` |
| `style-src` | CSS loading | `'self' 'unsafe-inline'` |
| `frame-src` | Iframe sources | `'none'` |

## Implementing CSP in Electron

Unlike web servers, Electron apps don't have a server to set HTTP headers. Instead, CSP is injected via the `webRequest` API:

```javascript
// main.cjs
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  const url = new URL(details.url);
  const isMainApp = url.hostname === 'localhost' || url.protocol === 'file:';

  if (isMainApp) {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [buildCSP()]
      }
    });
  } else {
    // Don't modify CSP for YouTube Music or OAuth providers
    callback({ responseHeaders: details.responseHeaders });
  }
});
```

## Why Different CSPs for Different Windows?

DJ.ai loads content from multiple origins:
- **Main app** (localhost) — strict CSP, only allowlisted API domains
- **YouTube Music** (music.youtube.com) — needs YouTube's own CSP to function
- **OAuth providers** (accounts.google.com) — need their native CSP

Applying a strict CSP to YouTube Music would break it. The solution: only inject custom CSP for the main app's pages.

## Key Links

- [CSP in Electron](https://www.electronjs.org/docs/latest/tutorial/security#6-define-a-content-security-policy)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator (Google)](https://csp-evaluator.withgoogle.com/)

## Key Takeaways

- CSP prevents XSS by **allowlisting resource origins**
- In Electron, inject CSP via `session.webRequest.onHeadersReceived`
- Use **different CSP rules** for different windows/content types
- `connect-src` is critical — controls which APIs the app can call
- Don't apply your CSP to third-party windows (they need their own policies)

## DJ.ai Connection

DJ.ai's CSP configuration in `electron-app/electron/main.cjs` uses `onHeadersReceived` to inject headers only for the main app (localhost/file protocol). The CSP allows connections to AI API domains (OpenAI, Google, ElevenLabs), music provider APIs, and the local OAuth proxy. It blocks `frame-src` to prevent embedding, and restricts `script-src` to prevent unauthorized script execution. YouTube Music and OAuth windows are excluded from custom CSP injection, letting them function with their native security policies.
