namespace DJai.OAuthProxy.Services;

public interface IDeviceAuthService
{
    bool IsValidDevice(string deviceToken);
    bool CheckAndRecordRequest(string deviceToken);
    [Obsolete("Use CheckAndRecordRequest for atomic rate limiting.")]
    bool CheckRateLimit(string deviceToken);
    [Obsolete("Use CheckAndRecordRequest for atomic rate limiting.")]
    void RecordRequest(string deviceToken);
    int GetDeviceCount();
}
