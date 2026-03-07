# URL Validation

## Why URL Validation Is Hard

URLs look simple but have deceptively complex parsing rules. Naive string operations (`startsWith`, `includes`, `indexOf`) lead to security bypasses. This lesson covers the pitfalls and DJ.ai's approach to safe URL handling.

## Common Pitfalls

### 1. `startsWith` Bypass (Subdomain Confusion)

```javascript
// ❌ VULNERABLE
url.startsWith("https://api.openai.com")

// Attacker sends:
"https://api.openai.com.evil.com/exfiltrate"  // ← passes check, resolves to evil.com
```

### 2. Userinfo SSRF

```javascript
// ❌ VULNERABLE — URL has a "userinfo" field before @
"https://api.openai.com:password@attacker.com/"
// Browser connects to attacker.com, sends "api.openai.com:password" as basic auth
```

### 3. Protocol Smuggling

```javascript
// ❌ VULNERABLE — checking hostname but not protocol
"javascript://api.openai.com/%0aalert(1)"  // ← XSS via javascript: protocol
"file:///etc/passwd"                        // ← Local file access
```

### 4. Unicode/Punycode Confusion

```javascript
// ❌ VULNERABLE — homoglyph attack
"https://аpi.openai.com"  // First 'а' is Cyrillic, not Latin 'a'
// Resolves to a completely different domain
```

## The Safe Approach: `new URL()` Parsing

```javascript
function isAllowedHost(urlString, allowlist) {
  try {
    const url = new URL(urlString);

    // 1. Reject userinfo (SSRF bypass)
    if (url.username || url.password) return false;

    // 2. Enforce HTTPS only
    if (url.protocol !== 'https:') return false;

    // 3. Check exact hostname match
    if (!allowlist.includes(url.hostname)) return false;

    // 4. Reject non-standard ports (optional)
    if (url.port && url.port !== '443') return false;

    return true;
  } catch {
    return false;  // Malformed URL → reject
  }
}
```

## DJ.ai Implementation

DJ.ai extracted all URL validation into a pure function module:

| File | Functions |
|------|-----------|
| `electron-app/electron/validation.cjs` | `isAllowedAIHost()` — validates AI API destinations |
| `electron-app/electron/validation.cjs` | `isAllowedOAuthHost()` — validates OAuth provider URLs |
| `electron-app/electron/validation.cjs` | `isValidRedirectUri()` — validates OAuth redirect URIs |
| `electron-app/electron/validation.cjs` | `isAllowedExternalProtocol()` — validates shell.openExternal URLs |
| `electron-app/electron/validation.cjs` | `isValidYouTubeMusicUrl()` — validates YouTube Music embed URLs |
| `electron-app/electron/__tests__/validation.test.ts` | Tests covering bypass attempts |

### Design Principles

1. **Pure functions** — validation logic is side-effect-free and easily testable
2. **Allowlist, not blocklist** — explicitly list what's allowed; reject everything else
3. **Parse, don't match** — use `new URL()` for structured parsing, never regex or string ops on raw URLs
4. **Defense in depth** — multiple checks (protocol, userinfo, hostname, port) for each validation

### Lesson Learned

This validation module was **extracted as a direct result of MOE code review** findings. The original code used `startsWith` checks inline in IPC handlers. The review found multiple bypass vectors, and the fix was to:
1. Create a dedicated validation module with pure functions
2. Add comprehensive tests including adversarial inputs
3. Apply consistent validation across all URL-accepting IPC handlers

## Key Takeaways

- **Never use string operations** (`startsWith`, `includes`, regex) on raw URLs for security
- **Always use `new URL()`** to parse URLs into structured components
- **Check `url.hostname`** against an allowlist — not the full URL string
- **Reject userinfo** (`url.username || url.password`) — it enables SSRF
- **Enforce protocol** — only allow `https:` for external resources
- **Test adversarial inputs** — include bypass attempts in your test suite

## References

- [MDN — URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [URL Living Standard](https://url.spec.whatwg.org/)
- [OWASP — Unvalidated Redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)
