using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace DJai.OAuthProxy.Services;

public class RedisStateStoreService : IStateStoreService
{
    private static readonly TimeSpan DefaultExpiry = TimeSpan.FromMinutes(10);
    private const string KeyPrefix = "oauth:state:";

    private readonly IDatabase? _db;
    private readonly ILogger<RedisStateStoreService> _logger;

    // In-memory fallback when Redis is unavailable (always initialized)
    private readonly ConcurrentDictionary<string, (string DeviceToken, DateTime CreatedAt)> _fallbackStore;

    public RedisStateStoreService(
        ILogger<RedisStateStoreService> logger,
        IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _fallbackStore = new ConcurrentDictionary<string, (string, DateTime)>();

        if (redis != null)
        {
            _db = redis.GetDatabase();
            _logger.LogInformation("RedisStateStoreService: using Redis backend");
        }
        else
        {
            _logger.LogWarning("RedisStateStoreService: Redis unavailable, using in-memory fallback");
        }
    }

    public async Task StoreStateAsync(string state, string deviceToken, TimeSpan? expiry = null)
    {
        var ttl = expiry ?? DefaultExpiry;

        if (_db != null)
        {
            try
            {
                var key = $"{KeyPrefix}{state}";
                await _db.StringSetAsync(key, deviceToken, ttl);
                return;
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during StoreStateAsync, falling back to in-memory");
            }
            catch (Exception ex) when (ex is not OutOfMemoryException)
            {
                _logger.LogWarning(ex, "Unexpected error during StoreStateAsync Redis call, falling back to in-memory");
            }
        }

        _fallbackStore.TryAdd(state, (deviceToken, DateTime.UtcNow));
        PruneFallbackStore();
    }

    public async Task<string?> ConsumeStateAsync(string state)
    {
        if (_db != null)
        {
            try
            {
                var key = $"{KeyPrefix}{state}";
                var value = await _db.StringGetDeleteAsync(key);
                return value.HasValue ? value.ToString() : null;
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during ConsumeStateAsync, falling back to in-memory");
            }
            catch (Exception ex) when (ex is not OutOfMemoryException)
            {
                _logger.LogWarning(ex, "Unexpected error during ConsumeStateAsync Redis call, falling back to in-memory");
            }
        }

        if (_fallbackStore.TryRemove(state, out var entry))
        {
            // Respect the 10-minute TTL for in-memory entries
            if ((DateTime.UtcNow - entry.CreatedAt) < DefaultExpiry)
            {
                return entry.DeviceToken;
            }
        }
        return null;
    }

    private void PruneFallbackStore()
    {
        var cutoff = DateTime.UtcNow - DefaultExpiry;
        foreach (var key in _fallbackStore.Keys)
        {
            if (_fallbackStore.TryGetValue(key, out var entry) && entry.CreatedAt < cutoff)
                _fallbackStore.TryRemove(key, out _);
        }
    }
}
