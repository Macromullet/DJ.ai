using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Azure.Core.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace DJai.OAuthProxy.Tests.Helpers;

/// <summary>
/// Mock implementation of HttpRequestData for unit testing Azure Functions.
/// </summary>
public class MockHttpRequestData : HttpRequestData
{
    public MockHttpRequestData(
        FunctionContext context,
        string method = "POST",
        string url = "http://localhost/api/test",
        Stream? body = null,
        HttpHeadersCollection? headers = null)
        : base(context)
    {
        Method = method;
        Url = new Uri(url);
        Body = body ?? new MemoryStream();
        Headers = headers ?? new HttpHeadersCollection();
    }

    public override Stream Body { get; }
    public override HttpHeadersCollection Headers { get; }
    public override IReadOnlyCollection<IHttpCookie> Cookies => Array.Empty<IHttpCookie>();
    public override Uri Url { get; }
    public override IEnumerable<ClaimsIdentity> Identities => Enumerable.Empty<ClaimsIdentity>();
    public override string Method { get; }

    public override HttpResponseData CreateResponse()
    {
        return new MockHttpResponseData(FunctionContext);
    }

    /// <summary>
    /// Creates a mock POST request with a JSON body and optional X-Device-Token header.
    /// </summary>
    public static MockHttpRequestData CreateJsonRequest<T>(
        T body,
        string? deviceToken = null,
        string url = "http://localhost/api/test") where T : class
    {
        var json = JsonSerializer.Serialize(body);
        var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));

        var headers = new HttpHeadersCollection();
        if (deviceToken != null)
            headers.Add("X-Device-Token", deviceToken);

        var context = CreateMockFunctionContext();
        return new MockHttpRequestData(context, "POST", url, stream, headers);
    }

    /// <summary>
    /// Creates a mock GET request with optional X-Device-Token header.
    /// </summary>
    public static MockHttpRequestData CreateGetRequest(
        string? deviceToken = null,
        string url = "http://localhost/api/test")
    {
        var headers = new HttpHeadersCollection();
        if (deviceToken != null)
            headers.Add("X-Device-Token", deviceToken);

        var context = CreateMockFunctionContext();
        return new MockHttpRequestData(context, "GET", url, headers: headers);
    }

    private static FunctionContext CreateMockFunctionContext()
    {
        var services = new ServiceCollection();
        // Register the JSON serializer required by ReadFromJsonAsync/WriteAsJsonAsync
        services.AddSingleton<IOptions<WorkerOptions>>(
            Options.Create(new WorkerOptions { Serializer = new JsonObjectSerializer() }));
        var serviceProvider = services.BuildServiceProvider();

        var context = new Mock<FunctionContext>();
        context.SetupGet(c => c.InstanceServices).Returns(serviceProvider);
        return context.Object;
    }
}

/// <summary>
/// Mock implementation of HttpResponseData for unit testing Azure Functions.
/// </summary>
public class MockHttpResponseData : HttpResponseData
{
    public MockHttpResponseData(FunctionContext context) : base(context)
    {
        Headers = new HttpHeadersCollection();
        Body = new MemoryStream();
    }

    public override HttpStatusCode StatusCode { get; set; }
    public override HttpHeadersCollection Headers { get; set; }
    public override Stream Body { get; set; }
    public override HttpCookies Cookies => throw new NotImplementedException();

    /// <summary>
    /// Reads the response body as a deserialized object of the given type.
    /// </summary>
    public T? ReadBodyAs<T>()
    {
        Body.Position = 0;
        using var reader = new StreamReader(Body, leaveOpen: true);
        var json = reader.ReadToEnd();
        return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    /// <summary>
    /// Reads the response body as a JsonDocument for flexible inspection.
    /// </summary>
    public JsonDocument ReadBodyAsJson()
    {
        Body.Position = 0;
        return JsonDocument.Parse(Body, new JsonDocumentOptions { });
    }
}
