# 05 — Security

## Why Security Matters for Desktop + Cloud Apps

DJ.ai is an Electron desktop app that talks to cloud services (Azure Functions, music APIs, AI APIs). This creates a unique attack surface that spans **three trust boundaries**:

1. **The renderer process** — untrusted web content (album art, embedded players, user input)
2. **The main process** — has full Node.js access, OS-level privileges, file system
3. **The cloud backend** — handles OAuth secrets, talks to Azure Key Vault

A vulnerability in any layer can cascade. An XSS in the renderer could steal API keys. A misconfigured IPC bridge could give attackers Node.js access. A missing CORS check on the backend could let any website initiate OAuth flows.

## Learning Path

| # | Topic | What You'll Learn |
|---|-------|-------------------|
| 1 | [OAuth](oauth/) | Authorization Code Flow, PKCE, token refresh, state parameter, client secret protection |
| 2 | [Web Security](web-security/) | CSP, CORS, SSRF, URL validation, input validation |
| 3 | [Electron Security](electron-security/) | Context isolation, RCE prevention, safe storage |
| 4 | [JWT](jwt/) | Token structure, signing algorithms, common vulnerabilities |
| 5 | [Secrets Management](secrets-management/) | dotnet user-secrets, Azure Key Vault, preventing secret leaks |
| 6 | [Rate Limiting](rate-limiting/) | Protecting APIs from abuse with token bucket and sliding window |

## DJ.ai Connection

Security is not a feature — it's a property of the system. Every file in `electron-app/electron/validation.cjs` exists because a real vulnerability was found during code review. The OAuth proxy in `oauth-proxy/` exists solely to keep client secrets off the desktop. The rate limiter in `oauth-proxy/Services/RedisDeviceAuthService.cs` exists because public APIs get abused.

## Key Takeaways

- **Defense in depth**: Multiple layers (CSP + context isolation + IPC validation + rate limiting)
- **Principle of least privilege**: Renderer gets minimal IPC surface via `preload.cjs`
- **Secrets never touch the client**: Azure Key Vault → backend only
- **Validate everything**: URLs, tokens, redirect URIs, device tokens

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) — The definitive web application security risks
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security) — Official Electron security guide
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/) — Comprehensive security requirements
