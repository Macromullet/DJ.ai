# Rate Limiting

## What Is Rate Limiting?

Rate limiting restricts how many requests a client can make within a time window. It protects APIs from abuse, brute-force attacks, denial-of-service, and runaway costs.

## Common Algorithms

### Token Bucket

```
Bucket capacity: 100 tokens
Refill rate: 10 tokens/second

Request arrives → Is there a token? → Yes: consume token, allow request
                                     → No: reject (429 Too Many Requests)

Tokens refill at a steady rate, allowing bursts up to bucket capacity.
```

### Sliding Window

```
Window: 1 hour
Limit: 100 requests

Track timestamps of all requests in the current window.
New request → Count requests in last 60 minutes
            → < 100: Allow
            → >= 100: Reject
```

### Fixed Window

```
Window: 1 hour (on the hour)
Limit: 100 requests

Simpler but has edge effects: 99 requests at 12:59 + 100 requests at 13:00 = 199 in 2 minutes.
```

## DJ.ai Implementation

DJ.ai uses rate limiting at **two levels**:

### 1. Backend — Device Token Rate Limiting

```csharp
// oauth-proxy/Services/RedisDeviceAuthService.cs
// Each device (identified by X-Device-Token GUID) gets:
//   - 100 requests per hour  (short-term burst protection)
//   - 1000 requests per day  (long-term abuse protection)
// Implemented with Redis atomic operations (INCR + EXPIRE)
```

**How it works:**
```
1. Client sends X-Device-Token header with every OAuth request
2. Backend validates token format (must be valid GUID)
3. Backend checks Redis: has this device exceeded hourly/daily limits?
4. Within limits → Process request, increment counter
5. Over limits → Return 429 Too Many Requests
```

| File | Role |
|------|------|
| `oauth-proxy/Services/IDeviceAuthService.cs` | Interface: `IsValidDevice()`, `CheckAndRecordRequest()` |
| `oauth-proxy/Services/RedisDeviceAuthService.cs` | Redis-backed rate limiter with dual windows |
| `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` | Checks rate limit before processing |
| `electron-app/src/providers/SpotifyProvider.ts` | Generates device token (UUID), sends in header |

### 2. Frontend — Decrypt Rate Limiting

```javascript
// electron-app/electron/main.cjs
// Limits safeStorage.decrypt to 10 calls per 60 seconds
// Purpose: If XSS occurs, attacker can't rapidly decrypt all API keys
```

| Aspect | Backend Rate Limit | Frontend Rate Limit |
|--------|-------------------|---------------------|
| **What** | OAuth API requests | safeStorage decrypt calls |
| **Window** | 100/hour, 1000/day | 10/minute |
| **Identifier** | Device token (GUID) | Per-process counter |
| **Storage** | Redis (distributed) | In-memory (local) |
| **Purpose** | Prevent API abuse | Limit XSS damage |

## Why Not Just Use API Keys?

Device tokens are **not authentication** — they're abuse prevention. The difference:

| Mechanism | Purpose | Revocable? | Identity? |
|-----------|---------|------------|-----------|
| API Key | Authentication | Yes | Yes |
| Device Token | Rate limiting | No (client-generated) | No |
| OAuth Token | Authorization | Yes | Yes |

Device tokens are GUIDs generated client-side and stored in localStorage. They provide enough uniqueness for rate limiting without requiring registration.

## Key Takeaways

- Rate limiting prevents abuse, brute-force, and runaway costs
- Use **dual windows** (hourly + daily) to catch both burst and sustained abuse
- Redis atomic operations (`INCR` + `EXPIRE`) make rate limiting safe for concurrent requests
- Rate-limit **sensitive operations** (decrypt) in addition to API endpoints
- Device tokens provide lightweight abuse prevention without requiring authentication

## References

- [Google Cloud — Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [OWASP — Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [Redis — Rate Limiting Pattern](https://redis.io/glossary/rate-limiting/)
