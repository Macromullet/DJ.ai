# Azure Cache for Redis

## What Is Redis?

Redis is an in-memory data structure store used as a cache, message broker, and database. Azure Cache for Redis is the managed version — Microsoft handles clustering, replication, patching, and failover.

DJ.ai uses Redis for two critical operations:
1. **Rate limiting** — tracking request counts per device
2. **OAuth state storage** — CSRF protection tokens with TTL

## Redis Data Structures

| Structure | Use Case | DJ.ai Usage |
|-----------|----------|-------------|
| **Sorted Set** | Time-windowed counting | Rate limit tracking per device |
| **String** | Key-value with TTL | OAuth state tokens |

## Rate Limiting with Sorted Sets

DJ.ai tracks request rates using Redis sorted sets with timestamps as scores:

```csharp
// Redis Lua script for atomic check-and-record
const string checkAndRecordScript = """
    local now = tonumber(ARGV[1])
    local dailyLimit = tonumber(ARGV[3])
    local hourlyLimit = tonumber(ARGV[5])

    -- Remove expired entries
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - dailyWindowMs)
    redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - hourlyWindowMs)

    -- Check limits
    if redis.call('ZCARD', KEYS[1]) >= dailyLimit then return 0 end
    if redis.call('ZCARD', KEYS[2]) >= hourlyLimit then return 0 end

    -- Record request
    redis.call('ZADD', KEYS[1], now, member)
    redis.call('ZADD', KEYS[2], now, member)
    return 1
""";
```

Using a Lua script ensures the check-and-increment is **atomic** — no race condition between checking the count and recording the request.

**Rate limits per device:**
- 100 requests/hour
- 1,000 requests/day
- Maximum 10,000 tracked devices

## OAuth State Storage

CSRF tokens are stored with automatic expiration:

```csharp
public async Task StoreStateAsync(string state, string deviceToken, TimeSpan? expiry = null)
{
    var key = $"oauth:state:{state}";
    var ttl = expiry ?? TimeSpan.FromMinutes(10);
    await _database.StringSetAsync(key, deviceToken, ttl);
}

// Atomic consume (get + delete in one operation)
public async Task<string?> ConsumeStateAsync(string state)
{
    var key = $"oauth:state:{state}";
    return await _database.StringGetDeleteAsync(key);  // Prevents replay attacks
}
```

`StringGetDeleteAsync` prevents **TOCTOU** (Time-of-Check-to-Time-of-Use) vulnerabilities — the state can only be consumed once.

## Fallback to In-Memory

When Redis is unavailable, DJ.ai falls back to in-memory stores:

```csharp
var redisConnection = context.Configuration.GetConnectionString("cache");
if (!string.IsNullOrEmpty(redisConnection))
{
    services.AddSingleton<IConnectionMultiplexer>(
        ConnectionMultiplexer.Connect(redisConnection));
}
// Services use Redis if available, in-memory ConcurrentDictionary otherwise
```

## Key Links

- [Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
- [Redis Data Types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Lua Scripting](https://redis.io/docs/latest/develop/interact/programmability/eval-intro/)

## Key Takeaways

- Redis sorted sets are ideal for **sliding window rate limiting**
- Use **Lua scripts** for atomic multi-step operations
- `StringGetDeleteAsync` prevents **replay attacks** on OAuth state
- Always implement **in-memory fallback** for local development resilience

## DJ.ai Connection

DJ.ai's `RedisDeviceAuthService` and `RedisStateStoreService` in `oauth-proxy/Services/` implement rate limiting and state storage. Redis is provisioned as a container by Aspire during local development (`builder.AddRedis("cache").WithRedisInsight()`) and as Azure Cache for Redis in production. The connection string is injected via the `cache` connection string, and both services gracefully fall back to `ConcurrentDictionary` when Redis is unavailable.
