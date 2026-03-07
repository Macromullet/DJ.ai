# API Key Management

## The Challenge

AI API keys grant direct access to paid services. A leaked key means:
- **Financial loss** — attacker runs up charges on your account
- **Rate limit exhaustion** — legitimate users blocked
- **Data exposure** — attacker can see your usage patterns and prompts

## DJ.ai's Approach

DJ.ai stores AI API keys on the **client** (not the backend) because all AI API calls go directly from the Electron app. This means key security is handled by Electron's safeStorage:

```
User enters API key → Encrypted with OS keychain → Stored in app data
API request needed  → Decrypted (rate-limited)   → Sent via IPC proxy
```

### Storage Security

| Layer | Protection |
|-------|------------|
| **At rest** | Encrypted via Electron safeStorage (OS keychain) |
| **In transit** | HTTPS only (validated by `isAllowedAIHost()`) |
| **Access control** | Rate-limited decrypt (10/minute) to limit XSS damage |
| **Validation** | Test request on entry to verify key works |

## DJ.ai Source Files

| File | Role |
|------|------|
| `electron-app/src/utils/secretStorage.ts` | `setSecret()`, `getSecret()` — safeStorage wrapper |
| `electron-app/src/utils/validateApiKey.ts` | Validates keys by making test API requests through IPC |
| `electron-app/electron/preload.cjs` | Exposes `safeStorage.encrypt()`, `safeStorage.decrypt()` |
| `electron-app/electron/main.cjs` | Rate-limited decrypt IPC handlers |

### Key Validation Flow

When a user enters an API key in settings:

```typescript
// electron-app/src/utils/validateApiKey.ts
// 1. Format check — basic pattern matching (starts with expected prefix)
// 2. Test request — send a minimal API call through the IPC proxy
// 3. Check response — 200 = valid, 401 = invalid key, other = network error
// 4. Store — encrypt with safeStorage if valid
```

### Per-Provider Key Patterns

| Provider | Key Prefix | Header |
|----------|------------|--------|
| OpenAI | `sk-` | `Authorization: Bearer sk-...` |
| Anthropic | `sk-ant-` | `x-api-key: sk-ant-...` |
| Google/Gemini | `AI...` | URL query: `?key=AI...` |
| ElevenLabs | Various | `xi-api-key: ...` |

## Best Practices

### For Users

1. **Use restricted keys** — create keys with minimum required permissions
2. **Set spending limits** — all providers offer per-key or per-account limits
3. **Rotate regularly** — generate new keys monthly, revoke old ones
4. **Monitor usage** — check dashboards for unexpected spikes

### For Developers

1. **Never log API keys** — even in debug logs
2. **Never include in error messages** — sanitize before displaying
3. **Validate before storing** — confirm the key works
4. **Encrypt at rest** — use OS keychain, not plaintext storage
5. **Rate-limit access** — limit how quickly stored keys can be retrieved

## Key Takeaways

- AI API keys are stored **client-side** in DJ.ai (encrypted with safeStorage)
- Rate-limited decrypt prevents mass exfiltration via XSS
- Validate keys on entry — saves users from typos and expired keys
- Each provider has different auth patterns (header vs. URL param)
- Set spending limits on all AI provider accounts

## References

- [OpenAI Production Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [Anthropic API Keys](https://docs.anthropic.com/en/docs/initial-setup#set-your-api-key)
- [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/)
