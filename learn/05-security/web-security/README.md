# Web Security Fundamentals

## Why Web Security in a Desktop App?

Electron apps **are** web apps. Under the hood, DJ.ai's UI runs in Chromium — the same engine as Chrome. This means every web vulnerability applies: XSS, CSRF, CORS bypasses, injection attacks, and more.

But Electron apps have an extra twist: the main process has **full Node.js access**. If an attacker exploits a web vulnerability to escape the renderer, they get OS-level access — file system, network, system commands. This makes web security even more critical in Electron than in a browser.

## Attack Surface Map

```
┌─────────────────────────────────────────────────────┐
│  Renderer Process (Chromium)                        │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Album art   │  │ Embedded │  │ OAuth popup   │  │
│  │ (untrusted) │  │ players  │  │ (untrusted)   │  │
│  └─────────────┘  └──────────┘  └───────────────┘  │
│                        │ IPC                        │
├────────────────────────┼────────────────────────────┤
│  Main Process (Node.js)│                            │
│  ┌──────────┐  ┌───────┴──────┐  ┌──────────────┐  │
│  │ File     │  │ IPC handlers │  │ AI API proxy │  │
│  │ system   │  │ (validated)  │  │ (validated)  │  │
│  └──────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Topics in This Section

| File | Concept | DJ.ai Relevance |
|------|---------|-----------------|
| [content-security-policy.md](content-security-policy.md) | CSP directives | CSP set in main.cjs via session headers |
| [cors.md](cors.md) | Cross-Origin Resource Sharing | OAuth proxy CORS config for localhost |
| [ssrf.md](ssrf.md) | Server-Side Request Forgery | IPC proxy URL allowlist |
| [url-validation.md](url-validation.md) | URL parsing pitfalls | `validation.cjs` — found via MOE review |
| [input-validation.md](input-validation.md) | Defense in depth | ValidationService in backend |

## DJ.ai Connection

Web security in DJ.ai is primarily enforced in two files:
- **`electron-app/electron/validation.cjs`** — 9 exported validation functions covering URLs, OAuth hosts, CSP, playback actions, and external protocols
- **`electron-app/electron/main.cjs`** — CSP header injection, IPC handler validation, rate-limited decrypt

Several of these protections were added after **real vulnerabilities** were found during Mixture-of-Experts code review — including SSRF via `startsWith` bypass and unrestricted `shell.openExternal`.

## Key Takeaways

- Electron apps inherit all web vulnerabilities **plus** Node.js escape risks
- CSP, CORS, and input validation are your primary defense layers
- Every IPC handler must validate its inputs — the renderer is untrusted
- URL validation must use `new URL()` parsing, never string matching

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN — Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
