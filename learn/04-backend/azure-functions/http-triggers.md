# HTTP Triggers in Azure Functions

## What Are HTTP Triggers?

HTTP triggers turn Azure Functions into HTTP endpoints — they respond to GET, POST, PUT, DELETE requests just like a traditional web API. Each function is decorated with `[HttpTrigger]` specifying the HTTP methods and route template.

## Defining an HTTP Function

```csharp
public class YouTubeOAuthFunctions
{
    private readonly ISecretService _secretService;
    private readonly IDeviceAuthService _deviceAuthService;
    private readonly IValidationService _validationService;
    private readonly IStateStoreService _stateStore;

    [Function("YouTubeOAuthInitiate")]
    public async Task<HttpResponseData> InitiateYouTubeOAuth(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post",
            Route = "oauth/youtube/initiate")]
        HttpRequestData req)
    {
        // Validate device token
        var deviceToken = req.Headers
            .TryGetValues("X-Device-Token", out var values)
            ? values.FirstOrDefault() : null;

        if (string.IsNullOrEmpty(deviceToken) ||
            !_deviceAuthService.IsValidDevice(deviceToken))
            return UnauthorizedResponse(req, "Invalid device token");

        // Read request body
        var body = await req.ReadFromJsonAsync<OAuthInitiateRequest>();

        // Validate redirect URI
        if (!_validationService.IsValidRedirectUri(body.RedirectUri))
            return BadRequestResponse(req, "Invalid redirect URI");

        // Check rate limit
        if (!_deviceAuthService.CheckAndRecordRequest(deviceToken))
            return TooManyRequestsResponse(req);

        // Fetch client ID from Key Vault
        var clientId = await _secretService.GetSecretAsync("GoogleClientId");

        // Generate and store CSRF state
        var state = Guid.NewGuid().ToString();
        await _stateStore.StoreStateAsync(state, deviceToken);

        // Build auth URL
        var authUrl = BuildGoogleAuthUrl(clientId, body.RedirectUri, state);

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new OAuthInitiateResponse
        {
            AuthUrl = authUrl,
            State = state
        });
        return response;
    }
}
```

## Route Parameters

The `Route` property defines URL patterns with optional parameters:

```csharp
// Static route
[HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "oauth/youtube/initiate")]

// The /api/ prefix is automatic (configurable in host.json)
// Full URL: POST /api/oauth/youtube/initiate
```

## Request and Response

The isolated worker uses `HttpRequestData` and `HttpResponseData`:

```csharp
// Reading JSON body
var body = await req.ReadFromJsonAsync<OAuthExchangeRequest>();

// Reading headers
req.Headers.TryGetValues("X-Device-Token", out var values);

// Creating responses
var response = req.CreateResponse(HttpStatusCode.OK);
await response.WriteAsJsonAsync(new { token = "abc123" });

// Error responses
var error = req.CreateResponse(HttpStatusCode.BadRequest);
await error.WriteAsJsonAsync(new ErrorResponse
{
    Error = "invalid_request",
    Message = "Missing authorization code"
});
```

## Authorization Levels

| Level | Behavior |
|-------|----------|
| `Anonymous` | No key required (DJ.ai uses this + device tokens) |
| `Function` | Requires function-specific API key |
| `Admin` | Requires host master key |

DJ.ai uses `Anonymous` because it implements its own device token authentication instead of relying on Azure's built-in key system.

## Key Links

- [HTTP Trigger Binding](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger)
- [HTTP Trigger Reference](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=python-v2%2Cisolated-process%2Cnodejs-v4&pivots=programming-language-csharp)

## Key Takeaways

- Use `[Function("Name")]` + `[HttpTrigger]` to define HTTP endpoints
- Routes are automatically prefixed with `/api/` (configurable)
- `HttpRequestData`/`HttpResponseData` handle request parsing and response creation
- DJ.ai uses `Anonymous` auth level with custom device token validation

## DJ.ai Connection

DJ.ai defines 10 HTTP-triggered functions across three provider files in `oauth-proxy/Functions/`: YouTube (initiate/exchange/refresh), Spotify (initiate/exchange/refresh), Apple Music (initiate/developer-token/validate), and a health check. Every OAuth function follows the same pattern: validate device token → check rate limit → validate inputs → fetch secrets → call provider → return tokens. This consistency makes the codebase easy to extend when adding new providers.
