# Electron Security

## Why Electron Security Is Different

Electron combines **Chromium** (a web browser) with **Node.js** (a server runtime) in a single application. This is incredibly powerful — and incredibly dangerous. A single misconfiguration can give web content full access to the operating system.

```
┌─────────────────────────────────┐
│  Renderer Process               │  ← Runs web content (HTML/JS/CSS)
│  ⚠️ Treat as UNTRUSTED          │     Like a browser tab
│  No Node.js access (if secure)  │
├─────────────────────────────────┤
│  Preload Script                 │  ← Bridge between worlds
│  Controlled API surface         │     contextBridge.exposeInMainWorld()
├─────────────────────────────────┤
│  Main Process                   │  ← Full Node.js + OS access
│  🔒 PRIVILEGED                   │     File system, network, shell, etc.
│  Must validate ALL IPC inputs   │
└─────────────────────────────────┘
```

## The Critical Rule

> **The renderer is untrusted territory.** Treat it like a public website. Never give it direct access to Node.js, the file system, or shell commands.

If `nodeIntegration: true` is set (the insecure default in older Electron), any XSS vulnerability becomes a **Remote Code Execution** — the attacker can `require('child_process').exec('rm -rf /')`.

## Topics in This Section

| File | Threat | DJ.ai Defense |
|------|--------|---------------|
| [context-isolation.md](context-isolation.md) | Prototype chain attacks | `contextIsolation: true`, preload bridge |
| [remote-code-execution.md](remote-code-execution.md) | RCE via shell, eval, node | Protocol validation, action maps |
| [safe-storage.md](safe-storage.md) | Secret exfiltration | OS keychain, rate-limited decrypt |

## DJ.ai Connection

DJ.ai's Electron security is configured in:

- **`electron-app/electron/main.cjs`** — Window creation with `nodeIntegration: false`, `contextIsolation: true`, CSP injection, IPC handler validation, rate-limited decrypt
- **`electron-app/electron/preload.cjs`** — Minimal `contextBridge` API surface for OAuth, AI proxy, safeStorage, and notifications
- **`electron-app/electron/validation.cjs`** — Pure validation functions used by all IPC handlers

## Key Takeaways

- Always set `nodeIntegration: false` and `contextIsolation: true`
- The preload script is your security boundary — expose the minimum necessary API
- Validate every IPC message in the main process before acting on it
- Use `shell.openExternal` only with validated HTTPS URLs
- Rate-limit sensitive operations (decrypt, file access) to limit XSS impact

## References

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security) — Official guide (must-read)
- [OWASP Electron Security](https://owasp.org/www-project-electron-security/)
- [Electron Security Best Practices (Doyensec)](https://blog.doyensec.com/2022/09/27/electron-security-checklist-2022.html)
