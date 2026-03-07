# SSRF — Server-Side Request Forgery

## What Is SSRF?

Server-Side Request Forgery occurs when an attacker tricks a server (or privileged process) into making requests to **unintended destinations**. In DJ.ai's case, the "server" is the Electron main process — which has full network access and bypasses browser CORS restrictions.

```
Attacker's goal:
  Renderer sends IPC request with URL → Main process fetches it → Returns response

If the URL isn't validated, the attacker can:
  ✗ Hit internal services (http://localhost:6379 → Redis)
  ✗ Scan internal networks (http://192.168.1.1)
  ✗ Exfiltrate data to attacker's server (https://evil.com/steal?data=...)
  ✗ Access cloud metadata (http://169.254.169.254)
```

## The DJ.ai Bug: `startsWith` Bypass

**This was a REAL vulnerability found during Mixture-of-Experts code review.**

The original IPC proxy validated URLs like this:

```javascript
// ❌ VULNERABLE: startsWith is NEVER safe for URL validation
const ALLOWED = ["https://api.openai.com", "https://api.anthropic.com"];
if (ALLOWED.some(prefix => url.startsWith(prefix))) {
  // Looks safe... but it's not
}
```

The bypass:
```
https://api.openai.com.attacker.com/steal-tokens
│                     │
└── starts with ──────┘  ← startsWith returns TRUE
    "https://api.openai.com"
```

Another bypass using userinfo:
```
https://api.openai.com:user@attacker.com/
│                          │
└── URL userinfo field ────┘  ← Browser sends request to attacker.com
```

## The Fix: URL Object Parsing

DJ.ai now uses `new URL()` to parse URLs and validates the **hostname** specifically:

```javascript
// ✅ SAFE: Parse URL, check hostname
function isAllowedAIHost(urlString) {
  try {
    const url = new URL(urlString);
    // Reject userinfo (user:pass@host SSRF bypass)
    if (url.username || url.password) return false;
    // Reject non-HTTPS
    if (url.protocol !== 'https:') return false;
    // Check exact hostname match
    return AI_API_ALLOWLIST.includes(url.hostname);
  } catch {
    return false;  // Invalid URL → reject
  }
}
```

## DJ.ai Source Files

| File | Role |
|------|------|
| `electron-app/electron/validation.cjs` | `isAllowedAIHost()` — validates AI API URLs against allowlist |
| `electron-app/electron/validation.cjs` | `isAllowedOAuthHost()` — validates OAuth provider URLs |
| `electron-app/electron/main.cjs` | IPC handlers call validation before fetching any URL |
| `electron-app/electron/__tests__/validation.test.ts` | Tests for SSRF bypass prevention |

### The Allowlist

```javascript
// electron-app/electron/validation.cjs
const AI_API_ALLOWLIST = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.elevenlabs.io'
];
```

## Key Takeaways

- **`startsWith` is NEVER safe for URL matching** — always parse with `new URL()`
- Check `url.hostname` (not the full URL string) against an allowlist
- Reject URLs with userinfo (`user:pass@host`) — it's a classic SSRF bypass
- Enforce HTTPS-only to prevent protocol downgrade attacks
- The main process is privileged — every URL it fetches must be validated

## References

- [OWASP — Server-Side Request Forgery](https://owasp.org/www-community/attacks/Server_Side_Request_Forgery)
- [PortSwigger — SSRF](https://portswigger.net/web-security/ssrf)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
