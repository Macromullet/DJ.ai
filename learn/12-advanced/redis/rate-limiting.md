# Rate Limiting with Redis

## The Concept

**Rate limiting** restricts how many requests a client can make in a time window. It protects backends from abuse, ensures fair usage, and prevents runaway costs. Redis is ideal for rate limiting because it offers atomic counters with expiry — exactly what you need to track request counts per time window.

### Common Algorithms

| Algorithm | Description | Complexity |
|-----------|-------------|-----------|
| **Fixed Window** | Count requests per fixed interval (e.g., per hour) | Simple, but allows bursts at window boundaries |
| **Sliding Window** | Count requests in a rolling time window | Smooth, prevents boundary bursts |
| **Token Bucket** | Tokens replenish over time; each request consumes one | Allows controlled bursting |
| **Leaky Bucket** | Requests queue and process at a fixed rate | Smoothest, but adds latency |

## DJ.ai's Rate Limiting

DJ.ai uses **per-device rate limiting** on the OAuth proxy. Each Electron client generates a device GUID (stored in localStorage as `X-Device-Token`) that identifies it for rate limiting purposes.

### Limits

| Window | Limit | Purpose |
|--------|-------|---------|
| Per hour | 100 requests | Prevent rapid abuse |
| Per day | 1000 requests | Prevent sustained abuse |

### Fixed Window Implementation

```csharp
// Simplified from RedisDeviceAuthService
public async Task<bool> CheckRateLimitAsync(string deviceToken)
{
    var hourKey = $"ratelimit:{deviceToken}:hour:{DateTime.UtcNow:yyyyMMddHH}";
    var dayKey = $"ratelimit:{deviceToken}:day:{DateTime.UtcNow:yyyyMMdd}";

    // Atomic increment + set expiry if new
    var hourCount = await _db.StringIncrementAsync(hourKey);
    if (hourCount == 1)
        await _db.KeyExpireAsync(hourKey, TimeSpan.FromHours(1));

    var dayCount = await _db.StringIncrementAsync(dayKey);
    if (dayCount == 1)
        await _db.KeyExpireAsync(dayKey, TimeSpan.FromDays(1));

    return hourCount <= 100 && dayCount <= 1000;
}
```

### Why This Works

1. **`StringIncrementAsync`** — Atomic increment, no race conditions
2. **Key includes time window** — `ratelimit:abc:hour:2024011514` (hour 14 on Jan 15)
3. **TTL auto-cleanup** — Keys expire after the window closes
4. **No lock needed** — Redis `INCR` is atomic by design

### Sliding Window Alternative

For smoother rate limiting, use a sorted set with timestamps:

```csharp
// Sliding window using sorted sets
var key = $"ratelimit:{deviceToken}:sliding";
var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
var windowStart = now - TimeSpan.FromHours(1).TotalMilliseconds;

// Remove expired entries
await _db.SortedSetRemoveRangeByScoreAsync(key, 0, windowStart);

// Count remaining entries
var count = await _db.SortedSetLengthAsync(key);

if (count < 100)
{
    // Under limit — add this request
    await _db.SortedSetAddAsync(key, Guid.NewGuid().ToString(), now);
    await _db.KeyExpireAsync(key, TimeSpan.FromHours(2)); // Safety TTL
    return true;
}

return false; // Rate limited
```

### Response Headers

Rate-limited endpoints return standard headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 73
X-RateLimit-Reset: 1705338000
Retry-After: 3600  (only when limit exceeded)
```

## DJ.ai Connection

The `RedisDeviceAuthService` in `oauth-proxy/Services/` implements per-device rate limiting using Redis atomic counters. The `X-Device-Token` header identifies each Electron client. Rate limiting is checked before processing any OAuth operation. This is basic abuse prevention, not cryptographic security — the device token is a GUID stored in localStorage.

## Key Takeaways

- Redis atomic `INCR` is perfect for rate limit counters — no locks needed
- Include the time window in the key name for fixed-window limiting
- Always set TTL on rate limit keys to prevent memory leaks
- Return standard rate limit headers so clients can self-regulate

## Further Reading

- [Redis Rate Limiting Guide](https://redis.io/glossary/rate-limiting/)
- [Google Cloud: Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Stripe: Rate Limiting at Scale](https://stripe.com/blog/rate-limiters)
