# Safe Storage: OS-Level Encryption

## What Is Safe Storage?

Electron's `safeStorage` module provides **operating system-level encryption** for sensitive data. Instead of storing secrets in plaintext (in `localStorage` or config files), you encrypt them using the OS keychain:

| Platform | Backend |
|----------|---------|
| Windows | DPAPI (Data Protection API) |
| macOS | Keychain Services |
| Linux | libsecret (GNOME Keyring / KWallet) |

The encrypted data can only be decrypted on the same machine, by the same OS user — it's tied to the user's login credentials.

## How It Works

```javascript
// main.cjs — Encryption handler
ipcMain.handle('safe-storage-encrypt', (event, plaintext) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available');
  }
  // Returns a Buffer, convert to base64 for storage
  return safeStorage.encryptString(plaintext).toString('base64');
});
```

The renderer stores the encrypted base64 string in `localStorage`. When the value is needed, it sends a decrypt request:

```javascript
// main.cjs — Rate-limited decryption
const decryptCallTimestamps = [];
const DECRYPT_MAX_CALLS = 10;
const DECRYPT_WINDOW_MS = 60_000;

ipcMain.handle('safe-storage-decrypt', (event, encrypted) => {
  // Rate limiting: max 10 decrypts per minute
  const now = Date.now();
  while (decryptCallTimestamps.length > 0 &&
         decryptCallTimestamps[0] <= now - DECRYPT_WINDOW_MS) {
    decryptCallTimestamps.shift();
  }
  if (decryptCallTimestamps.length >= DECRYPT_MAX_CALLS) {
    throw new Error('Rate limit exceeded — max 10 calls per minute');
  }
  decryptCallTimestamps.push(now);

  const buffer = Buffer.from(encrypted, 'base64');
  return safeStorage.decryptString(buffer);
});
```

## Why Rate Limiting on Decrypt?

Even though the encryption is OS-level, rate limiting the decrypt endpoint prevents:
- **Brute-force enumeration** — a compromised renderer can't rapidly try decrypting arbitrary data
- **Side-channel attacks** — limits how fast information can be extracted
- **Accidental abuse** — bugs causing tight decrypt loops

## Key Links

- [safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage)
- [Windows DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/)
- [macOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)

## Key Takeaways

- `safeStorage` encrypts data using the **OS keychain** — not a custom algorithm
- Encrypted data is **machine-specific and user-specific**
- Always check `isEncryptionAvailable()` before encrypting
- **Rate limit decryption** to prevent abuse from compromised renderers
- Store encrypted values as base64 strings in `localStorage`

## DJ.ai Connection

DJ.ai uses safe storage in `electron-app/electron/main.cjs` to encrypt API keys for AI services (OpenAI, Google AI, ElevenLabs). When a user enters an API key in the settings UI, the React component calls `window.electron.safeStorage.encrypt(key)`, and the encrypted base64 result is stored in `localStorage`. When the key is needed for an API call, `window.electron.safeStorage.decrypt()` retrieves the plaintext — subject to the 10-calls-per-minute rate limit. The preload script exposes three methods: `encrypt`, `decrypt`, and `isAvailable`, keeping the API surface minimal.
