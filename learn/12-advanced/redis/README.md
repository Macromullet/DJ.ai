# Redis

## The Concept

**Redis** is an in-memory data structure store used as a database, cache, and message broker. It's not a traditional key-value store — Redis supports rich data structures (strings, hashes, lists, sets, sorted sets) with atomic operations, making it ideal for real-time applications.

### Why Redis?

| Use Case | Why Redis Excels |
|----------|-----------------|
| **Caching** | Sub-millisecond reads from memory |
| **Rate limiting** | Atomic counters with TTL (expiry) |
| **Session storage** | Fast read/write with automatic cleanup |
| **Pub/Sub** | Real-time message broadcasting |
| **Leaderboards** | Sorted sets with O(log N) operations |

## Redis in DJ.ai

DJ.ai uses Azure Cache for Redis for two purposes:

1. **Device token management** — Store and validate device tokens with expiry
2. **Rate limiting** — Track per-device request counts with sliding windows

### Architecture

```
Electron App
  → X-Device-Token: abc-123
    → OAuth Proxy (Azure Functions)
      → Redis: Validate token, check rate limit
        → Key Vault: Get client secret
          → Google OAuth: Exchange token
```

## Learning Path

| File | Topic |
|------|-------|
| [data-structures.md](./data-structures.md) | Redis data types and operations |
| [rate-limiting.md](./rate-limiting.md) | Rate limiting patterns with Redis |

## Key Takeaways

- Redis is an in-memory data store — fast but volatile (use persistence for durability)
- TTL (time-to-live) on keys enables automatic cleanup
- Atomic operations prevent race conditions in concurrent environments
- Azure Cache for Redis provides managed hosting with replication

## Further Reading

- [Redis Documentation](https://redis.io/docs/latest/)
- [Azure Cache for Redis](https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/cache-overview)
