# Local Development with Azure Functions Core Tools

## What Are Azure Functions Core Tools?

Azure Functions Core Tools (`func`) is a command-line tool that lets you develop and test Azure Functions locally. It provides a local runtime that mirrors the Azure environment — your functions respond to HTTP requests, connect to local services, and use the same configuration system.

## Installation

```bash
# Install globally via npm
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Verify installation
func --version
```

Version 4 is required for .NET 8 and the isolated worker model.

## Running Locally

```bash
cd oauth-proxy
func start --port 7071
```

This starts the Functions host on port 7071, registering all HTTP endpoints:

```
Azure Functions Core Tools
Core Tools Version: 4.x

Functions:
  YouTubeOAuthInitiate: [POST] http://localhost:7071/api/oauth/youtube/initiate
  YouTubeOAuthExchange: [POST] http://localhost:7071/api/oauth/youtube/exchange
  YouTubeOAuthRefresh:  [POST] http://localhost:7071/api/oauth/youtube/refresh
  SpotifyOAuthInitiate: [POST] http://localhost:7071/api/oauth/spotify/initiate
  ...
  HealthCheck:          [GET]  http://localhost:7071/api/health
```

## Local Configuration

Functions read from `local.settings.json` for local development:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AZURE_FUNCTIONS_ENVIRONMENT": "Development"
  },
  "ConnectionStrings": {
    "cache": "localhost:6379"
  }
}
```

Secrets come from `dotnet user-secrets` (not `local.settings.json`), keeping them out of source control.

## Debugging

With Visual Studio Code or Visual Studio, you can attach a debugger:

```bash
# Start with debugging enabled
func start --port 7071 --dotnet-isolated-debug

# Or use launch.json in VS Code
```

Set breakpoints in your function code and step through OAuth flows.

## Testing Endpoints

```bash
# Health check
curl http://localhost:7071/api/health

# Initiate OAuth (requires device token and body)
curl -X POST http://localhost:7071/api/oauth/youtube/initiate \
  -H "X-Device-Token: your-guid-here" \
  -H "Content-Type: application/json" \
  -d '{"redirectUri": "http://localhost:5173/oauth/callback"}'
```

## Key Links

- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local)
- [Local Development Guide](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local#local-settings-file)
- [Debugging Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-develop-local#debugging-functions-locally)

## Key Takeaways

- `func start` runs the full Functions runtime locally
- `local.settings.json` provides non-secret configuration
- Use `dotnet user-secrets` for OAuth client secrets (not local.settings.json)
- Port 7071 is the convention for local Functions development
- Core Tools v4 is required for .NET 8 isolated worker

## DJ.ai Connection

DJ.ai typically uses Aspire (`cd DJai.AppHost && dotnet run`) to start the Functions app alongside Redis, but you can also run functions directly with `cd oauth-proxy && func start --port 7071`. The `.\setup.ps1 --local` script configures `dotnet user-secrets` with the OAuth client IDs and secrets needed for local development. When running through Aspire, secrets are injected as environment variables from the Aspire host's configuration, and Redis is automatically started as a container.
