using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StackExchange.Redis;
using DJai.OAuthProxy.Services;

namespace DJai.OAuthProxy.Tests.Services;

/// <summary>
/// Tests for RedisStateStoreService — both in-memory fallback and Redis-backed paths.
/// </summary>
public class RedisStateStoreServiceTests
{
    private static RedisStateStoreService CreateFallbackService()
    {
        var logger = LoggerFactory
            .Create(b => b.AddFilter(_ => false))
            .CreateLogger<RedisStateStoreService>();
        return new RedisStateStoreService(logger, redis: null);
    }

    private static (RedisStateStoreService Service, Mock<IDatabase> DbMock) CreateRedisService()
    {
        var logger = LoggerFactory
            .Create(b => b.AddFilter(_ => false))
            .CreateLogger<RedisStateStoreService>();

        var dbMock = new Mock<IDatabase>();
        var redisMock = new Mock<IConnectionMultiplexer>();
        redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(dbMock.Object);

        var service = new RedisStateStoreService(logger, redis: redisMock.Object);
        return (service, dbMock);
    }

    #region Fallback: Store and Consume

    [Fact]
    public async Task StoreAndConsume_ReturnsDeviceToken()
    {
        var service = CreateFallbackService();
        var state = Guid.NewGuid().ToString();
        var deviceToken = "device-123";

        await service.StoreStateAsync(state, deviceToken);
        var result = await service.ConsumeStateAsync(state);

        result.Should().Be(deviceToken);
    }

    [Fact]
    public async Task ConsumeState_NotStored_ReturnsNull()
    {
        var service = CreateFallbackService();

        var result = await service.ConsumeStateAsync("nonexistent-state");

        result.Should().BeNull();
    }

    [Fact]
    public async Task ConsumeState_SecondConsume_ReturnsNull()
    {
        var service = CreateFallbackService();
        var state = Guid.NewGuid().ToString();

        await service.StoreStateAsync(state, "device-456");

        var first = await service.ConsumeStateAsync(state);
        var second = await service.ConsumeStateAsync(state);

        first.Should().Be("device-456");
        second.Should().BeNull();
    }

    [Fact]
    public async Task StoreState_MultipleStates_EachConsumedIndependently()
    {
        var service = CreateFallbackService();

        await service.StoreStateAsync("state-a", "device-a");
        await service.StoreStateAsync("state-b", "device-b");

        var resultA = await service.ConsumeStateAsync("state-a");
        var resultB = await service.ConsumeStateAsync("state-b");

        resultA.Should().Be("device-a");
        resultB.Should().Be("device-b");
    }

    [Fact]
    public async Task StoreState_CustomExpiry_StillWorksWithinWindow()
    {
        var service = CreateFallbackService();
        var state = Guid.NewGuid().ToString();

        await service.StoreStateAsync(state, "device-789", TimeSpan.FromMinutes(5));
        var result = await service.ConsumeStateAsync(state);

        result.Should().Be("device-789");
    }

    #endregion

    #region Redis: StoreStateAsync calls correct commands

    [Fact]
    public async Task Redis_StoreState_CallsStringSetWithCorrectKeyAndTtl()
    {
        var (service, dbMock) = CreateRedisService();
        var state = "test-state-id";
        var deviceToken = "device-abc";

        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        await service.StoreStateAsync(state, deviceToken);

        dbMock.Verify(d => d.StringSetAsync(
            It.Is<RedisKey>(k => k.ToString() == "oauth:state:test-state-id"),
            It.Is<RedisValue>(v => v.ToString() == "device-abc"),
            It.Is<TimeSpan?>(t => t!.Value.TotalMinutes >= 9 && t.Value.TotalMinutes <= 11),
            It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public async Task Redis_StoreState_CustomExpiry_PassedToRedis()
    {
        var (service, dbMock) = CreateRedisService();

        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        await service.StoreStateAsync("s", "d", TimeSpan.FromMinutes(5));

        dbMock.Verify(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.Is<TimeSpan?>(t => t!.Value.TotalMinutes >= 4 && t.Value.TotalMinutes <= 6),
            It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()), Times.Once);
    }

    #endregion

    #region Redis: ConsumeStateAsync uses atomic get-delete

    [Fact]
    public async Task Redis_ConsumeState_CallsStringGetDeleteAsync()
    {
        var (service, dbMock) = CreateRedisService();

        dbMock.Setup(d => d.StringGetDeleteAsync(
            It.Is<RedisKey>(k => k.ToString() == "oauth:state:my-state"),
            It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)"device-xyz");

        var result = await service.ConsumeStateAsync("my-state");

        result.Should().Be("device-xyz");
        dbMock.Verify(d => d.StringGetDeleteAsync(
            It.Is<RedisKey>(k => k.ToString() == "oauth:state:my-state"),
            It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public async Task Redis_ConsumeState_NotFound_ReturnsNull()
    {
        var (service, dbMock) = CreateRedisService();

        dbMock.Setup(d => d.StringGetDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);

        var result = await service.ConsumeStateAsync("missing-state");

        result.Should().BeNull();
    }

    #endregion

    #region Redis: Fallback on exception

    [Fact]
    public async Task Redis_StoreState_RedisException_FallsBackToInMemory()
    {
        var (service, dbMock) = CreateRedisService();

        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisException("Connection refused"));

        // Store should not throw — falls back to in-memory
        await service.Invoking(s => s.StoreStateAsync("state-1", "device-1"))
            .Should().NotThrowAsync();

        // The fallback store should have captured it; also make consume fall back
        dbMock.Setup(d => d.StringGetDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisException("Connection refused"));

        var result = await service.ConsumeStateAsync("state-1");
        result.Should().Be("device-1");
    }

    [Fact]
    public async Task Redis_ConsumeState_RedisException_FallsBackToInMemory()
    {
        var (service, dbMock) = CreateRedisService();

        // Store succeeds in Redis
        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(true);

        await service.StoreStateAsync("state-2", "device-2");

        // Consume fails in Redis — should check fallback store (which won't have it since store went to Redis)
        dbMock.Setup(d => d.StringGetDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisException("Connection refused"));

        var result = await service.ConsumeStateAsync("state-2");
        // State was stored in Redis (not fallback), so fallback won't have it
        result.Should().BeNull();
    }

    [Fact]
    public async Task Redis_StoreAndConsume_BothFail_UseFallbackEndToEnd()
    {
        var (service, dbMock) = CreateRedisService();

        // Both Redis operations fail
        dbMock.Setup(d => d.StringSetAsync(
            It.IsAny<RedisKey>(), It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(), It.IsAny<bool>(), It.IsAny<When>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisException("Connection refused"));
        dbMock.Setup(d => d.StringGetDeleteAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ThrowsAsync(new RedisException("Connection refused"));

        await service.StoreStateAsync("state-3", "device-3");
        var result = await service.ConsumeStateAsync("state-3");

        result.Should().Be("device-3");

        // Second consume should return null (already consumed from fallback)
        var second = await service.ConsumeStateAsync("state-3");
        second.Should().BeNull();
    }

    #endregion
}
