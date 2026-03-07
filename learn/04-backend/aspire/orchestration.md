# Aspire Orchestration: The AppHost

## What Is the AppHost?

The AppHost project is the entry point for Aspire orchestration. It defines **what services exist**, **how they connect**, and **what configuration they need**. When you run `dotnet run` in the AppHost, Aspire starts everything — containers, projects, and external processes.

## DJ.ai's AppHost

```csharp
// DJai.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

// 1. Add Redis container with management UI
var redis = builder.AddRedis("cache")
    .WithRedisInsight();

// 2. Read OAuth secrets from configuration
var spotifyClientId = builder.Configuration["SpotifyClientId"];
var spotifyClientSecret = builder.Configuration["SpotifyClientSecret"];

// 3. Add Azure Functions project
var oauthProxy = builder.AddAzureFunctionsProject<Projects.DJai_OAuthProxy>("oauth-proxy")
    .WithReference(redis)                           // Connect to Redis
    .WithExternalHttpEndpoints()                    // Expose HTTP endpoints
    .WithEnvironment("SpotifyClientId", spotifyClientId)
    .WithEnvironment("SpotifyClientSecret", spotifyClientSecret);

// 4. Add Vite dev server for frontend
builder.AddViteApp("electron-app", "../electron-app", "dev")
    .WithReference(oauthProxy)                      // Can discover oauth-proxy
    .WithEnvironment("VITE_OAUTH_PROXY_URL",
        ReferenceExpression.Create($"{oauthProxy.GetEndpoint("http")}/api"));

builder.Build().Run();
```

## Key Concepts

### Service References

`WithReference(redis)` tells Aspire that oauth-proxy depends on Redis. Aspire:
1. Starts Redis **before** oauth-proxy
2. Injects the connection string as `ConnectionStrings__cache`
3. Shows the dependency in the dashboard

### Environment Injection

`WithEnvironment()` passes configuration values to services:

```csharp
.WithEnvironment("SpotifyClientId", spotifyClientId)
```

This is how OAuth secrets flow from the developer's machine (Aspire host config) to the running Functions app without being in source control.

### ReferenceExpression

```csharp
ReferenceExpression.Create($"{oauthProxy.GetEndpoint("http")}/api")
```

This dynamically resolves the oauth-proxy's URL at startup, so the Vite app knows where to send OAuth requests regardless of what port Aspire assigns.

## Starting the Environment

```bash
cd DJai.AppHost
dotnet run
```

This starts:
1. Redis container (Docker required)
2. Azure Functions app (requires `azure-functions-core-tools@4`)
3. Vite dev server (runs `npm run dev`)
4. Aspire dashboard at https://localhost:15888

## Key Links

- [App Host Overview](https://learn.microsoft.com/en-us/dotnet/aspire/fundamentals/app-host-overview)
- [Service Discovery](https://learn.microsoft.com/en-us/dotnet/aspire/service-discovery/overview)

## Key Takeaways

- The AppHost is a **single entry point** for the entire development environment
- `WithReference()` creates **dependency ordering and connection string injection**
- `WithEnvironment()` passes configuration without hardcoding
- Aspire handles **container lifecycle** (Redis) and **process management** (Functions, Vite)

## DJ.ai Connection

DJ.ai's AppHost in `DJai.AppHost/Program.cs` orchestrates three services: Redis (container), oauth-proxy (Azure Functions), and electron-app (Vite). OAuth secrets are read from the Aspire host's configuration (which pulls from `dotnet user-secrets`) and injected as environment variables. The oauth-proxy URL is dynamically resolved and passed to the Vite app. This setup means developers only need `dotnet run` to start the full stack with proper service discovery and configuration.
