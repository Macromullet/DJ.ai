# Redis Data Structures

## The Concept

Redis isn't just a key-value store — it supports **rich data structures** with specialized operations. Each data type is optimized for specific access patterns, and choosing the right structure for your use case is key to effective Redis usage.

### Core Data Types

| Type | Description | DJ.ai Use Case |
|------|-------------|---------------|
| **String** | Binary-safe string (up to 512MB) | Device token validation |
| **Hash** | Field-value pairs (like a dictionary) | Device metadata |
| **List** | Ordered collection (linked list) | Request queues |
| **Set** | Unordered unique elements | — |
| **Sorted Set** | Unique elements with scores | Rate limit windows |

## Strings

The simplest type — a key maps to a value. Supports atomic increment/decrement and TTL:

```redis
SET device:abc-123 "valid" EX 86400    -- Set with 24h expiry
GET device:abc-123                      -- → "valid"
TTL device:abc-123                      -- → seconds remaining
INCR ratelimit:abc-123:hour            -- Atomic increment
```

### How DJ.ai Uses Strings

Device tokens are stored as string keys with TTL:

```csharp
// RedisDeviceAuthService (simplified)
await _db.StringSetAsync(
    $"device:{deviceToken}",
    "valid",
    TimeSpan.FromDays(30)
);

bool exists = await _db.KeyExistsAsync($"device:{deviceToken}");
```

## Hashes

A hash stores multiple field-value pairs under one key — like a dictionary or object:

```redis
HSET device:abc-123 created "2024-01-15" provider "spotify" requests "42"
HGET device:abc-123 provider    -- → "spotify"
HINCRBY device:abc-123 requests 1  -- Atomic field increment
HGETALL device:abc-123          -- → all fields
```

## Sorted Sets

Elements with numeric scores, automatically sorted. Perfect for time-based data:

```redis
ZADD ratelimit:abc-123 1705334400 "req-1"    -- Score = timestamp
ZADD ratelimit:abc-123 1705334401 "req-2"
ZRANGEBYSCORE ratelimit:abc-123 1705330800 1705334400  -- Requests in window
ZCARD ratelimit:abc-123                        -- Total count
```

## Key Expiry (TTL)

Every key can have an expiry time. When it expires, Redis deletes it automatically:

```redis
SET temp:data "value" EX 3600     -- Expires in 1 hour
EXPIRE existing:key 300            -- Add 5-minute expiry to existing key
TTL existing:key                   -- Check remaining time
PERSIST existing:key               -- Remove expiry (make permanent)
```

### Why TTL Matters

Without TTL, Redis memory grows indefinitely. DJ.ai uses TTL for:
- Device tokens (30-day expiry)
- Rate limit counters (1-hour sliding window)
- OAuth state parameters (10-minute expiry)

## DJ.ai Connection

The `RedisDeviceAuthService` in `oauth-proxy/Services/` uses Redis strings for device token validation and atomic counters for rate limiting. Device tokens are stored with a 30-day TTL, and rate limit counters expire after their window closes. The Redis instance is provisioned via Bicep in `infra/core/redis.bicep` and accessed through Azure Cache for Redis.

## Key Takeaways

- Choose the right data structure for your access pattern (strings for simple values, sorted sets for time windows)
- Always set TTL on keys to prevent unbounded memory growth
- Atomic operations (`INCR`, `HINCRBY`) prevent race conditions without locks
- Redis is in-memory — fast but bounded by available RAM

## Further Reading

- [Redis Data Types](https://redis.io/docs/latest/develop/data-types/)
- [Redis Commands Reference](https://redis.io/docs/latest/commands/)
- [Redis University](https://university.redis.io/)
