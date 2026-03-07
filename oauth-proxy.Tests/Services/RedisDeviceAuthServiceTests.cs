using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StackExchange.Redis;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Tests.Services;

/// <summary>
/// Tests for RedisDeviceAuthService — both in-memory fallback and Redis-backed paths.
/// </summary>
public class RedisDeviceAuthServiceTests
{
    private static RedisDeviceAuthService CreateFallbackService()
    {
        var logger = LoggerFactory
            .Create(b => b.AddFilter(_ => false))
            .CreateLogger<RedisDeviceAuthService>();
        return new RedisDeviceAuthService(logger, redis: null);
    }

    private static (RedisDeviceAuthService Service, Mock<IDatabase> DbMock) CreateRedisService()
    {
        var logger = LoggerFactory
            .Create(b => b.AddFilter(_ => false))
            .CreateLogger<RedisDeviceAuthService>();

        var dbMock = new Mock<IDatabase>();
        var redisMock = new Mock<IConnectionMultiplexer>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);

        var service = new RedisDeviceAuthService(logger, redis: redisMock.Object);
        return (service, dbMock);
    }

    #region Fallback: IsValidDevice

    [Fact]
    public void IsValidDevice_ValidGuid_ReturnsTrue()
    {
        var service = CreateFallbackService();
        var deviceToken = Guid.NewGuid().ToString();

        service.IsValidDevice(deviceToken).Should().BeTrue();
    }

    [Fact]
    public void IsValidDevice_InvalidGuid_ReturnsFalse()
    {
        var service = CreateFallbackService();

        service.IsValidDevice("not-a-valid-guid").Should().BeFalse();
    }

    [Fact]
    public void IsValidDevice_Empty_ReturnsFalse()
    {
        var service = CreateFallbackService();

        service.IsValidDevice("").Should().BeFalse();
    }

    [Fact]
    public void IsValidDevice_Null_ReturnsFalse()
    {
        var service = CreateFallbackService();

        service.IsValidDevice(null!).Should().BeFalse();
    }

    [Fact]
    public void IsValidDevice_SameDeviceCalledTwice_ReturnsTrue()
    {
        var service = CreateFallbackService();
        var token = Guid.NewGuid().ToString();

        service.IsValidDevice(token).Should().BeTrue();
        service.IsValidDevice(token).Should().BeTrue();
    }

    #endregion

    #region Fallback: CheckAndRecordRequest

    [Fact]
    public void CheckAndRecordRequest_UnderLimit_ReturnsTrue()
    {
        var service = CreateFallbackService();
        var token = Guid.NewGuid().ToString();
        service.IsValidDevice(token);

        service.CheckAndRecordRequest(token).Should().BeTrue();
    }

    [Fact]
    public void CheckAndRecordRequest_MultipleRequests_StaysUnderLimit()
    {
        var service = CreateFallbackService();
        var token = Guid.NewGuid().ToString();
        service.IsValidDevice(token);

        for (int i = 0; i < 50; i++)
        {
            service.CheckAndRecordRequest(token).Should().BeTrue();
        }
    }

    #endregion

    #region Fallback: Rate Limit Enforcement

    [Fact]
    public void CheckAndRecordRequest_ExceedsHourlyLimit_RejectsFurther()
    {
        var service = CreateFallbackService();
        var token = Guid.NewGuid().ToString();
        service.IsValidDevice(token);

        // Exhaust the 100/hour limit
        for (int i = 0; i < 100; i++)
        {
            service.CheckAndRecordRequest(token).Should().BeTrue($"request {i + 1} should pass");
        }

        // 101st request must be rejected
        service.CheckAndRecordRequest(token).Should().BeFalse("hourly rate limit (100) should be enforced");
    }

    [Fact]
    public void CheckAndRecordRequest_DifferentDevices_DoNotShareLimits()
    {
        var service = CreateFallbackService();
        var tokenA = Guid.NewGuid().ToString();
        var tokenB = Guid.NewGuid().ToString();
        service.IsValidDevice(tokenA);
        service.IsValidDevice(tokenB);

        // Exhaust rate limit for tokenA
        for (int i = 0; i < 100; i++)
            service.CheckAndRecordRequest(tokenA);

        // tokenA is blocked
        service.CheckAndRecordRequest(tokenA).Should().BeFalse();

        // tokenB should still work — separate rate limit bucket
        service.CheckAndRecordRequest(tokenB).Should().BeTrue();
    }

    [Fact]
    public void CheckAndRecordRequest_MultipleCallsAtLimit_AllRejected()
    {
        var service = CreateFallbackService();
        var token = Guid.NewGuid().ToString();
        service.IsValidDevice(token);

        for (int i = 0; i < 100; i++)
            service.CheckAndRecordRequest(token);

        // Multiple attempts past the limit should all fail
        for (int i = 0; i < 5; i++)
        {
            service.CheckAndRecordRequest(token).Should().BeFalse();
        }
    }

    #endregion

    #region Fallback: GetDeviceCount

    [Fact]
    public void GetDeviceCount_ReturnsCorrectCount()
    {
        var service = CreateFallbackService();

        service.IsValidDevice(Guid.NewGuid().ToString());
        service.IsValidDevice(Guid.NewGuid().ToString());
        service.IsValidDevice(Guid.NewGuid().ToString());

        service.GetDeviceCount().Should().Be(3);
    }

    [Fact]
    public void GetDeviceCount_InitiallyZero()
    {
        var service = CreateFallbackService();

        service.GetDeviceCount().Should().Be(0);
    }

    #endregion

    #region Redis: IsValidDevice calls correct commands

    [Fact]
    public void Redis_IsValidDevice_ExistingDevice_RefreshesTtl()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        // Simulate existing device: key exists and is in the sorted set
        dbMock.Setup(d => d.KeyExists(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>())).Returns(true);
        dbMock.Setup(d => d.SortedSetScore(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            It.Is<RedisValue>(v => v.ToString() == token),
            It.IsAny<CommandFlags>()))
            .Returns(1.0);

        var batch = new Mock<IBatch>();
        dbMock.Setup(d => d.CreateBatch(It.IsAny<object>())).Returns(batch.Object);

        service.IsValidDevice(token).Should().BeTrue();

        // Verify TTL refresh was batched
        batch.Verify(b => b.KeyExpireAsync(
            It.Is<RedisKey>(k => k.ToString() == $"device:{token}"),
            It.IsAny<TimeSpan>(),
            It.IsAny<ExpireWhen>(),
            It.IsAny<CommandFlags>()), Times.Once);
        batch.Verify(b => b.SortedSetAddAsync(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            It.Is<RedisValue>(v => v.ToString() == token),
            It.IsAny<double>(),
            It.IsAny<SortedSetWhen>(),
            It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public void Redis_IsValidDevice_NewDevice_RegistersInRedis()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        // Device doesn't exist yet
        dbMock.Setup(d => d.KeyExists(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>())).Returns(false);
        dbMock.Setup(d => d.SortedSetScore(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<CommandFlags>()))
            .Returns((double?)null);
        dbMock.Setup(d => d.SortedSetLength(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            It.IsAny<double>(), It.IsAny<double>(), It.IsAny<Exclude>(), It.IsAny<CommandFlags>()))
            .Returns(5); // under limit

        var batch = new Mock<IBatch>();
        dbMock.Setup(d => d.CreateBatch(It.IsAny<object>())).Returns(batch.Object);

        service.IsValidDevice(token).Should().BeTrue();

        // Verify device was registered via batch
        batch.Verify(b => b.StringSetAsync(
            It.Is<RedisKey>(k => k.ToString() == $"device:{token}"),
            It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(),
            It.IsAny<bool>(),
            It.IsAny<When>(),
            It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public void Redis_IsValidDevice_MaxDevicesReached_EvictsOldestAndRegisters()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        dbMock.Setup(d => d.KeyExists(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>())).Returns(false);
        dbMock.Setup(d => d.SortedSetScore(It.IsAny<RedisKey>(), It.IsAny<RedisValue>(), It.IsAny<CommandFlags>()))
            .Returns((double?)null);
        // Return max device count
        dbMock.Setup(d => d.SortedSetLength(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            It.IsAny<double>(), It.IsAny<double>(), It.IsAny<Exclude>(), It.IsAny<CommandFlags>()))
            .Returns(10000);

        // Mock batch for registration after eviction
        var batch = new Mock<IBatch>();
        dbMock.Setup(d => d.CreateBatch(It.IsAny<object>())).Returns(batch.Object);

        // LRU eviction should allow the new device to register
        service.IsValidDevice(token).Should().BeTrue();

        // Verify LRU eviction was called (removes oldest 10%)
        dbMock.Verify(d => d.SortedSetRemoveRangeByRank(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            0, 999,
            It.IsAny<CommandFlags>()), Times.Once);
    }

    #endregion

    #region Redis: CheckAndRecordRequest calls Lua script

    [Fact]
    public void Redis_CheckAndRecordRequest_Allowed_ReturnsTrue()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        // Lua script returns 1 = allowed
        dbMock.Setup(d => d.Execute(
            It.Is<string>(cmd => cmd == "EVAL"),
            It.IsAny<object[]>()))
            .Returns(RedisResult.Create((RedisValue)1L));

        service.CheckAndRecordRequest(token).Should().BeTrue();
    }

    [Fact]
    public void Redis_CheckAndRecordRequest_RateLimited_ReturnsFalse()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        // Lua script returns 0 = rate limited
        dbMock.Setup(d => d.Execute(
            It.Is<string>(cmd => cmd == "EVAL"),
            It.IsAny<object[]>()))
            .Returns(RedisResult.Create((RedisValue)0L));

        service.CheckAndRecordRequest(token).Should().BeFalse();
    }

    [Fact]
    public void Redis_CheckAndRecordRequest_LuaScript_ReceivesCorrectKeys()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        object[]? capturedArgs = null;
        dbMock.Setup(d => d.Execute(
            It.Is<string>(cmd => cmd == "EVAL"),
            It.IsAny<object[]>()))
            .Callback<string, object[]>((_, args) => capturedArgs = args)
            .Returns(RedisResult.Create((RedisValue)1L));

        service.CheckAndRecordRequest(token);

        // Args: script, numkeys=3, dailyKey, hourlyKey, deviceKey, ...
        capturedArgs.Should().NotBeNull();
        capturedArgs!.Length.Should().BeGreaterThan(5);
        // args[1] = numkeys (3)
        capturedArgs[1].Should().Be(3);
        // args[2] = dailyKey, args[3] = hourlyKey, args[4] = deviceKey
        capturedArgs[2].ToString().Should().Be($"ratelimit:daily:{token}");
        capturedArgs[3].ToString().Should().Be($"ratelimit:hourly:{token}");
        capturedArgs[4].ToString().Should().Be($"device:{token}");
    }

    #endregion

    #region Redis: Fallback on exception

    [Fact]
    public void Redis_IsValidDevice_RedisException_FallsBackToInMemory()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        // Redis throws on every call
        dbMock.Setup(d => d.SortedSetRemoveRangeByScore(
            It.IsAny<RedisKey>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<Exclude>(), It.IsAny<CommandFlags>()))
            .Throws(new RedisException("Connection lost"));

        // Should still succeed via in-memory fallback
        service.IsValidDevice(token).Should().BeTrue();
    }

    [Fact]
    public void Redis_CheckAndRecordRequest_RedisException_FallsBackToInMemory()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        dbMock.Setup(d => d.Execute(It.IsAny<string>(), It.IsAny<object[]>()))
            .Throws(new RedisException("Connection lost"));

        // Should succeed via in-memory fallback
        service.CheckAndRecordRequest(token).Should().BeTrue();
    }

    [Fact]
    public void Redis_CheckAndRecordRequest_RedisExceptionFallback_StillEnforcesRateLimit()
    {
        var (service, dbMock) = CreateRedisService();
        var token = Guid.NewGuid().ToString();

        dbMock.Setup(d => d.Execute(It.IsAny<string>(), It.IsAny<object[]>()))
            .Throws(new RedisException("Connection lost"));
        // IsValidDevice also needs to fall back
        dbMock.Setup(d => d.SortedSetRemoveRangeByScore(
            It.IsAny<RedisKey>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<Exclude>(), It.IsAny<CommandFlags>()))
            .Throws(new RedisException("Connection lost"));

        service.IsValidDevice(token);

        // Exhaust rate limit in fallback mode
        for (int i = 0; i < 100; i++)
            service.CheckAndRecordRequest(token).Should().BeTrue();

        // 101st should be rejected even in fallback
        service.CheckAndRecordRequest(token).Should().BeFalse();
    }

    #endregion

    #region Redis: GetDeviceCount

    [Fact]
    public void Redis_GetDeviceCount_ReturnsRedisCount()
    {
        var (service, dbMock) = CreateRedisService();

        dbMock.Setup(d => d.SortedSetLength(
            It.Is<RedisKey>(k => k.ToString() == "devices:active"),
            It.IsAny<double>(), It.IsAny<double>(), It.IsAny<Exclude>(), It.IsAny<CommandFlags>()))
            .Returns(42);

        service.GetDeviceCount().Should().Be(42);
    }

    #endregion
}
