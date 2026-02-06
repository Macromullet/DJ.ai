using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace DJai.OAuthProxy.Services;

public class RedisDeviceAuthService : IDeviceAuthService
{
    private readonly IDatabase? _db;
    private readonly ILogger<RedisDeviceAuthService> _logger;

    private const string DeviceKeyPrefix = "device:";
    private const string DeviceSetKey = "devices:active";
    private const string RateLimitHourlyPrefix = "ratelimit:hourly:";
    private const string RateLimitDailyPrefix = "ratelimit:daily:";

    private static readonly TimeSpan DeviceExpiry = TimeSpan.FromHours(24);
    private static readonly TimeSpan HourlyWindow = TimeSpan.FromHours(1);
    private static readonly TimeSpan DailyWindow = TimeSpan.FromHours(24);

    private readonly int _maxRequestsPerDay = 1000;
    private readonly int _maxRequestsPerHour = 100;
    private readonly int _maxDeviceCount = 10000;

    // In-memory fallback stores
    private readonly ConcurrentDictionary<string, DateTime> _fallbackDevices;
    private readonly ConcurrentDictionary<string, List<DateTime>> _fallbackRequestHistory;

    public RedisDeviceAuthService(
        ILogger<RedisDeviceAuthService> logger,
        IConnectionMultiplexer? redis = null)
    {
        _logger = logger;
        _fallbackDevices = new ConcurrentDictionary<string, DateTime>();
        _fallbackRequestHistory = new ConcurrentDictionary<string, List<DateTime>>();

        if (redis != null)
        {
            _db = redis.GetDatabase();
            _logger.LogInformation("RedisDeviceAuthService: using Redis backend");
        }
        else
        {
            _logger.LogWarning("RedisDeviceAuthService: Redis unavailable, using in-memory fallback");
        }
    }

    public bool IsValidDevice(string deviceToken)
    {
        if (string.IsNullOrWhiteSpace(deviceToken))
            return false;

        if (!Guid.TryParse(deviceToken, out _))
            return false;

        if (_db != null)
        {
            try
            {
                return IsValidDeviceRedis(deviceToken);
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during IsValidDevice, falling back to in-memory");
            }
        }

        return IsValidDeviceFallback(deviceToken);
    }

    public bool CheckAndRecordRequest(string deviceToken)
    {
        if (_db != null)
        {
            try
            {
                return CheckAndRecordRequestRedis(deviceToken);
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during CheckAndRecordRequest, falling back to in-memory");
            }
        }

        return CheckAndRecordRequestFallback(deviceToken);
    }

    [Obsolete("Use CheckAndRecordRequest for atomic rate limiting.")]
    public void RecordRequest(string deviceToken)
    {
        if (_db != null)
        {
            try
            {
                RecordRequestRedis(deviceToken);
                return;
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during RecordRequest, falling back to in-memory");
            }
        }

        RecordRequestFallback(deviceToken);
    }

    [Obsolete("Use CheckAndRecordRequest for atomic rate limiting.")]
    public bool CheckRateLimit(string deviceToken)
    {
        if (_db != null)
        {
            try
            {
                return CheckRateLimitRedis(deviceToken);
            }
            catch (RedisException ex)
            {
                _logger.LogWarning(ex, "Redis unavailable during CheckRateLimit, falling back to in-memory");
            }
        }

        return CheckRateLimitFallback(deviceToken);
    }

    public int GetDeviceCount()
    {
        if (_db != null)
        {
            return GetLiveDeviceCountRedis();
        }
        else
        {
            return _fallbackDevices.Count;
        }
    }

    // --- Redis implementations ---

    private bool IsValidDeviceRedis(string deviceToken)
    {
        var deviceKey = $"{DeviceKeyPrefix}{deviceToken}";
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var cutoffUnix = nowUnix - (long)DeviceExpiry.TotalSeconds;

        _db!.SortedSetRemoveRangeByScore(DeviceSetKey, double.NegativeInfinity, cutoffUnix);

        var hasDeviceKey = _db.KeyExists(deviceKey);
        var deviceSetScore = _db.SortedSetScore(DeviceSetKey, deviceToken);
        if (hasDeviceKey && deviceSetScore.HasValue)
        {
            var refreshBatch = _db.CreateBatch();
            refreshBatch.KeyExpireAsync(deviceKey, DeviceExpiry);
            refreshBatch.SortedSetAddAsync(DeviceSetKey, deviceToken, nowUnix);
            refreshBatch.Execute();
            return true;
        }

        var activeDeviceCount = _db.SortedSetLength(DeviceSetKey);
        if (activeDeviceCount >= _maxDeviceCount)
            return false;

        var registerBatch = _db.CreateBatch();
        registerBatch.StringSetAsync(deviceKey, "1", DeviceExpiry);
        registerBatch.SortedSetAddAsync(DeviceSetKey, deviceToken, nowUnix);
        registerBatch.Execute();

        return true;
    }

    private int GetLiveDeviceCountRedis()
    {
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var cutoffUnix = nowUnix - (long)DeviceExpiry.TotalSeconds;
        _db!.SortedSetRemoveRangeByScore(DeviceSetKey, double.NegativeInfinity, cutoffUnix);

        var count = _db.SortedSetLength(DeviceSetKey);
        return (int)Math.Min(count, int.MaxValue);
    }

    private bool CheckRateLimitRedis(string deviceToken)
    {
        // Refresh device last-seen TTL
        var deviceKey = $"{DeviceKeyPrefix}{deviceToken}";
        _db!.KeyExpire(deviceKey, DeviceExpiry, CommandFlags.FireAndForget);

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        // Check daily limit
        var dailyKey = $"{RateLimitDailyPrefix}{deviceToken}";
        _db.SortedSetRemoveRangeByScore(dailyKey, double.NegativeInfinity, now - (long)DailyWindow.TotalMilliseconds);
        var dailyCount = _db.SortedSetLength(dailyKey);
        if (dailyCount >= _maxRequestsPerDay)
            return false;

        // Check hourly limit
        var hourlyKey = $"{RateLimitHourlyPrefix}{deviceToken}";
        _db.SortedSetRemoveRangeByScore(hourlyKey, double.NegativeInfinity, now - (long)HourlyWindow.TotalMilliseconds);
        var hourlyCount = _db.SortedSetLength(hourlyKey);
        if (hourlyCount >= _maxRequestsPerHour)
            return false;

        return true;
    }

    private bool CheckAndRecordRequestRedis(string deviceToken)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var member = $"{now}:{Guid.NewGuid():N}";
        var dailyKey = $"{RateLimitDailyPrefix}{deviceToken}";
        var hourlyKey = $"{RateLimitHourlyPrefix}{deviceToken}";
        var deviceKey = $"{DeviceKeyPrefix}{deviceToken}";

        const string checkAndRecordScript = """
            local now = tonumber(ARGV[1])
            local dailyWindowMs = tonumber(ARGV[2])
            local dailyLimit = tonumber(ARGV[3])
            local hourlyWindowMs = tonumber(ARGV[4])
            local hourlyLimit = tonumber(ARGV[5])
            local member = ARGV[6]
            local deviceTtlSeconds = tonumber(ARGV[7])

            redis.call('EXPIRE', KEYS[3], deviceTtlSeconds)

            redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - dailyWindowMs)
            redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', now - hourlyWindowMs)

            local dailyCount = redis.call('ZCARD', KEYS[1])
            if dailyCount >= dailyLimit then
                return 0
            end

            local hourlyCount = redis.call('ZCARD', KEYS[2])
            if hourlyCount >= hourlyLimit then
                return 0
            end

            redis.call('ZADD', KEYS[1], now, member)
            redis.call('EXPIRE', KEYS[1], math.floor(dailyWindowMs / 1000) + 60)
            redis.call('ZADD', KEYS[2], now, member)
            redis.call('EXPIRE', KEYS[2], math.floor(hourlyWindowMs / 1000) + 60)

            return 1
            """;

        var result = (long)_db!.Execute(
            "EVAL",
            checkAndRecordScript,
            3,
            dailyKey,
            hourlyKey,
            deviceKey,
            now,
            (long)DailyWindow.TotalMilliseconds,
            _maxRequestsPerDay,
            (long)HourlyWindow.TotalMilliseconds,
            _maxRequestsPerHour,
            member,
            (int)DeviceExpiry.TotalSeconds);

        return result == 1;
    }

    private void RecordRequestRedis(string deviceToken)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var member = $"{now}:{Guid.NewGuid():N}"; // unique member per request

        var dailyKey = $"{RateLimitDailyPrefix}{deviceToken}";
        var hourlyKey = $"{RateLimitHourlyPrefix}{deviceToken}";

        var batch = _db!.CreateBatch();
        batch.SortedSetAddAsync(dailyKey, member, now);
        batch.KeyExpireAsync(dailyKey, DailyWindow + TimeSpan.FromMinutes(1));
        batch.SortedSetAddAsync(hourlyKey, member, now);
        batch.KeyExpireAsync(hourlyKey, HourlyWindow + TimeSpan.FromMinutes(1));
        batch.Execute();
    }

    // --- In-memory fallback implementations (mirrors original DeviceAuthService) ---

    private bool IsValidDeviceFallback(string deviceToken)
    {
        if (_fallbackDevices.ContainsKey(deviceToken))
            return true;

        // Evict stale devices
        var cutoff = DateTime.UtcNow.AddHours(-24);
        foreach (var key in _fallbackDevices.Keys)
        {
            if (_fallbackDevices.TryGetValue(key, out var lastSeen) && lastSeen < cutoff)
                _fallbackDevices.TryRemove(key, out _);
        }

        if (_fallbackDevices.Count >= _maxDeviceCount)
            return false;

        _fallbackDevices.TryAdd(deviceToken, DateTime.UtcNow);
        return true;
    }

    private bool CheckRateLimitFallback(string deviceToken)
    {
        _fallbackDevices[deviceToken] = DateTime.UtcNow;

        if (!_fallbackRequestHistory.TryGetValue(deviceToken, out var requests))
            return true;

        var now = DateTime.UtcNow;
        lock (requests)
        {
            requests.RemoveAll(r => (now - r).TotalHours > 24);

            if (requests.Count >= _maxRequestsPerDay)
                return false;

            var recentRequests = requests.Count(r => (now - r).TotalHours <= 1);
            if (recentRequests >= _maxRequestsPerHour)
                return false;
        }

        return true;
    }

    private bool CheckAndRecordRequestFallback(string deviceToken)
    {
        var now = DateTime.UtcNow;
        _fallbackDevices[deviceToken] = now;

        var requests = _fallbackRequestHistory.GetOrAdd(deviceToken, _ => new List<DateTime>());
        lock (requests)
        {
            requests.RemoveAll(r => (now - r).TotalHours > 24);
            if (requests.Count >= _maxRequestsPerDay)
                return false;

            var recentRequests = requests.Count(r => (now - r).TotalHours <= 1);
            if (recentRequests >= _maxRequestsPerHour)
                return false;

            requests.Add(now);
            return true;
        }
    }

    private void RecordRequestFallback(string deviceToken)
    {
        var requests = _fallbackRequestHistory.GetOrAdd(deviceToken, _ => new List<DateTime>());
        lock (requests)
        {
            var now = DateTime.UtcNow;
            requests.Add(now);
            requests.RemoveAll(t => t < now.AddHours(-24));
        }
    }
}
