# Sandbox and Node Integration

## The Two Critical Security Settings

Every Electron `BrowserWindow` has two settings that determine how much power the renderer process has:

### nodeIntegration: false (Default)

When `nodeIntegration` is disabled, the renderer **cannot** use `require()` or access Node.js built-in modules. This means no `fs`, no `child_process`, no `crypto` — nothing that could access the file system or execute commands.

```javascript
// ❌ With nodeIntegration: true (DANGEROUS)
const fs = require('fs');
fs.readFileSync('/etc/passwd');  // Full file system access!

// ✅ With nodeIntegration: false (SAFE)
require('fs');  // ReferenceError: require is not defined
```

### sandbox: true

The Chromium sandbox provides **process-level isolation**. A sandboxed renderer runs in a restricted OS process that cannot:
- Make arbitrary system calls
- Access memory of other processes
- Write to most file system locations
- Spawn child processes

Even if an attacker achieves code execution in a sandboxed renderer, the OS prevents them from doing real damage.

## Defense in Depth

These settings work together with context isolation:

```javascript
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,    // No Node.js APIs
    contextIsolation: true,    // Separate JS worlds
    sandbox: true,             // OS-level process sandbox
    preload: path.join(__dirname, 'preload.cjs')
  }
});
```

| Setting | Protects Against |
|---------|-----------------|
| `nodeIntegration: false` | Direct Node.js API abuse |
| `sandbox: true` | OS-level process escape |
| `contextIsolation: true` | JavaScript prototype pollution |
| Preload bridge | Uncontrolled IPC access |

## Why All Three Matter

Each setting addresses a different attack vector:

1. **XSS injects a script** → nodeIntegration blocks Node.js access
2. **Attacker modifies prototypes** → contextIsolation prevents interception
3. **Renderer exploits a V8 bug** → sandbox blocks OS-level escape

Removing any one layer weakens the others. This is why Electron's security documentation emphasizes using **all three together**.

## Key Links

- [Security: Only Load Secure Content](https://www.electronjs.org/docs/latest/tutorial/security#1-only-load-secure-content)
- [Sandbox Configuration](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)

## Key Takeaways

- **Never enable** `nodeIntegration` in windows that load external content
- The sandbox provides **OS-level** isolation, not just JavaScript-level
- Use **all three settings together**: no node integration, context isolation, sandbox
- These are **defaults in modern Electron** — don't override them

## DJ.ai Connection

DJ.ai configures all three security settings on every window created in `electron-app/electron/main.cjs`. The main app window and OAuth popup windows all have `nodeIntegration: false` and `contextIsolation: true`. This is especially critical for OAuth windows (which load content from Spotify and Apple identity servers). Even if any of these external sites were compromised, the attacker cannot escape the renderer sandbox.
