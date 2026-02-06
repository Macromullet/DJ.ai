namespace DJai.OAuthProxy.Services;

public interface IStateStoreService
{
    Task StoreStateAsync(string state, string deviceToken, TimeSpan? expiry = null);

    /// <summary>
    /// Atomically retrieves and deletes the device token associated with the given state.
    /// Returns null if the state does not exist or has expired.
    /// </summary>
    Task<string?> ConsumeStateAsync(string state);
}
