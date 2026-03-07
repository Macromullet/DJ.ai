# Electron Security Best Practices

## Overview

Security in Electron requires extra care because your app combines a full web browser with native OS capabilities. A vulnerability in a regular website might leak session cookies — but in Electron, the same vulnerability could access the file system, execute commands, or read encrypted credentials.

Electron's security model is built on **defense in depth**: multiple layers that each reduce the attack surface.

## Security Layers

```
┌──────────────────────────────────────────────┐
│ Layer 1: Content Security Policy (CSP)       │
│ Controls what resources pages can load        │
├──────────────────────────────────────────────┤
│ Layer 2: Context Isolation                    │
│ Separates preload and page JavaScript worlds  │
├──────────────────────────────────────────────┤
│ Layer 3: Node Integration Disabled            │
│ No require() or Node.js APIs in renderer     │
├──────────────────────────────────────────────┤
│ Layer 4: Sandbox Enabled                      │
│ Chromium's process-level sandbox              │
├──────────────────────────────────────────────┤
│ Layer 5: Window Open Handler                  │
│ Controls popup creation and navigation        │
├──────────────────────────────────────────────┤
│ Layer 6: Safe Storage                         │
│ OS-level encryption for sensitive data        │
└──────────────────────────────────────────────┘
```

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Content Security Policy](./content-security-policy.md) | HTTP headers controlling resource loading |
| [Safe Storage](./safe-storage.md) | OS-level encryption (DPAPI, Keychain) |
| [Sandbox & Node Integration](./sandbox-and-node-integration.md) | Process isolation settings |
| [Window Open Handler](./window-open-handler.md) | Controlling popup windows and navigation |

## The Principle of Least Privilege

Every security decision in Electron should follow this principle: **give each process only the capabilities it needs, nothing more.**

- Renderers don't get Node.js access → use preload bridge
- Preload exposes only specific IPC channels → not raw `ipcRenderer`
- CSP restricts resource origins → only allowlisted domains
- Window open handler blocks popups → only approved URLs

## Key Links

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [OWASP Electron Security](https://owasp.org/www-project-electron-security/)

## DJ.ai Connection

DJ.ai implements all six security layers. CSP headers are injected via `session.webRequest.onHeadersReceived` in `main.cjs`, with different rules for the main app versus YouTube Music windows. All windows have `nodeIntegration: false` and `contextIsolation: true`. The `setWindowOpenHandler` blocks unauthorized popups. Safe storage encrypts API keys with OS-level encryption. Rate limiting on the decrypt endpoint prevents brute-force attacks. These layers work together so that even if a third-party page (YouTube Music, OAuth providers) is compromised, it cannot escape the sandbox.
