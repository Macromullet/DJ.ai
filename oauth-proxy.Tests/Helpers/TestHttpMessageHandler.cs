using System.Net;
using System.Text;

namespace DJai.OAuthProxy.Tests.Helpers;

/// <summary>
/// Mock HTTP message handler that returns configurable preset responses.
/// Useful for testing OAuth token exchange and refresh flows without real HTTP calls.
/// </summary>
public class TestHttpMessageHandler : HttpMessageHandler
{
    private readonly Queue<HttpResponseMessage> _responses = new();
    private readonly List<HttpRequestMessage> _sentRequests = new();

    /// <summary>All requests that were sent through this handler.</summary>
    public IReadOnlyList<HttpRequestMessage> SentRequests => _sentRequests;

    /// <summary>
    /// Enqueue a response that will be returned on the next SendAsync call (FIFO order).
    /// </summary>
    public TestHttpMessageHandler EnqueueResponse(HttpResponseMessage response)
    {
        _responses.Enqueue(response);
        return this;
    }

    /// <summary>
    /// Enqueue a JSON response with the given status code.
    /// </summary>
    public TestHttpMessageHandler EnqueueJsonResponse(HttpStatusCode statusCode, string json)
    {
        var response = new HttpResponseMessage(statusCode)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        _responses.Enqueue(response);
        return this;
    }

    /// <summary>
    /// Enqueue a successful OAuth token response with the given values.
    /// </summary>
    public TestHttpMessageHandler EnqueueTokenResponse(
        string accessToken = "test-access-token",
        string? refreshToken = "test-refresh-token",
        int expiresIn = 3600,
        string tokenType = "Bearer")
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            access_token = accessToken,
            refresh_token = refreshToken,
            expires_in = expiresIn,
            token_type = tokenType
        });
        return EnqueueJsonResponse(HttpStatusCode.OK, json);
    }

    /// <summary>
    /// Enqueue a failed OAuth token response.
    /// </summary>
    public TestHttpMessageHandler EnqueueTokenErrorResponse(
        string error = "invalid_grant",
        string description = "Bad Request")
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            error,
            error_description = description
        });
        return EnqueueJsonResponse(HttpStatusCode.BadRequest, json);
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        _sentRequests.Add(request);

        if (_responses.Count == 0)
        {
            throw new InvalidOperationException(
                $"No more preset responses. Request: {request.Method} {request.RequestUri}");
        }

        return Task.FromResult(_responses.Dequeue());
    }
}
