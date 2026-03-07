# Input Validation

## The Principle

**Never trust input.** Every value that crosses a trust boundary — user input, URL parameters, HTTP headers, IPC messages — must be validated before use. Input validation is a foundational security practice and a key component of defense in depth.

## Validation Strategies

| Strategy | Description | Use When |
|----------|-------------|----------|
| **Allowlist** | Only accept known-good values | Provider names, action types, domains |
| **Format validation** | Check structure (regex, parsing) | Email addresses, UUIDs, URLs |
| **Range validation** | Check bounds | Port numbers, token lengths, file sizes |
| **Type validation** | Ensure correct data type | Numbers vs strings, arrays vs objects |
| **Sanitization** | Clean dangerous characters | HTML content, SQL parameters |

### Allowlist > Blocklist

```javascript
// ❌ Blocklist — easy to miss something
if (!input.includes("<script>")) { /* process */ }

// ✅ Allowlist — only accept known-good values
const VALID_PROVIDERS = ["spotify", "apple"];
if (VALID_PROVIDERS.includes(provider)) { /* process */ }
```

## DJ.ai Implementation

DJ.ai validates inputs at multiple layers:

### Backend — ValidationService

```csharp
// oauth-proxy/Services/ValidationService.cs
// Validates redirect URIs against allowlists:
// - Host allowlist (localhost only in dev)
// - Port allowlist (5173-5177 for Vite dev server)
// - Custom URI scheme allowlist (djai:// for deep links)
// Also validates OAuth state and authorization codes
```

### Frontend — Validation Module

| Function in `validation.cjs` | What It Validates |
|-------------------------------|-------------------|
| `isAllowedAIHost(url)` | AI API URL against hostname allowlist |
| `isAllowedOAuthHost(url)` | OAuth provider URL against hostname allowlist |
| `isValidRedirectUri(uri)` | OAuth redirect URI format and host |
| `isValidPlaybackAction(action)` | Playback command against action allowlist |
| `isAllowedExternalProtocol(url)` | External URLs for `shell.openExternal` |

| `isTTSResponseWithinLimit(size)` | TTS audio response size (max 10 MB) |

### Backend — Device Token Validation

```csharp
// oauth-proxy/Services/RedisDeviceAuthService.cs
// Device tokens must be valid GUIDs (Guid.TryParse)
// Prevents injection via the X-Device-Token header
```

### What Gets Validated

| Input | Where | Validation |
|-------|-------|------------|
| OAuth provider name | Backend functions | Allowlist: spotify, apple |
| Redirect URI | `ValidationService.cs` | Host/port/scheme allowlist |
| Device token | `RedisDeviceAuthService.cs` | GUID format (RFC 4122) |
| AI API URL | `validation.cjs` | Parsed hostname against allowlist |
| Playback action | `validation.cjs` | Allowlist of valid action strings |
| TTS response size | `validation.cjs` | Max 10 MB (prevents OOM) |
| External URL protocol | `validation.cjs` | `https:` only |

## Key Takeaways

- **Validate at every trust boundary** — IPC, HTTP endpoints, user input
- **Allowlist over blocklist** — explicitly define what's accepted
- **Validate early, reject fast** — don't process invalid data
- **Use structured parsing** — `new URL()`, `Guid.TryParse()`, typed DTOs
- **Defense in depth** — validate on both frontend (IPC handlers) and backend (Azure Functions)

## References

- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP Data Validation](https://owasp.org/www-project-proactive-controls/v3/en/c5-validate-inputs)
- [OWASP Top 10 — A03:2021 Injection](https://owasp.org/Top10/A03_2021-Injection/)
