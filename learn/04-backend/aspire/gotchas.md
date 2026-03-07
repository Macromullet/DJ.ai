# Aspire Gotchas

## Common Issues and Workarounds

Aspire simplifies orchestration, but it has some sharp edges — especially when combining Azure Functions, Vite, and Redis. Here are the issues DJ.ai encountered and how they were solved.

## 1. Azure Functions Need AddAzureFunctionsProject

**Problem:** Using `AddProject()` for Azure Functions fails silently — the Functions host doesn't start correctly.

**Fix:** Use the dedicated method:

```csharp
// ❌ Wrong
builder.AddProject<Projects.DJai_OAuthProxy>("oauth-proxy");

// ✅ Correct
builder.AddAzureFunctionsProject<Projects.DJai_OAuthProxy>("oauth-proxy");
```

`AddAzureFunctionsProject` configures the Azure Functions Core Tools host, proper port assignment, and the isolated worker runtime.

**Requirement:** `azure-functions-core-tools@4` must be installed globally:
```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

## 2. Vite: targetPort vs port

**Problem:** Using `WithHttpEndpoint(port: 5173)` causes Aspire's DCP (Distributed Computing Platform) to try binding port 5173 for its **proxy**, conflicting with Vite which also wants port 5173.

**Fix:** Use `targetPort` to tell Aspire which port Vite is already listening on:

```csharp
// ❌ Wrong — DCP and Vite both try to use 5173
builder.AddViteApp("electron-app", "../electron-app", "dev")
    .WithHttpEndpoint(port: 5173);

// ✅ Correct — Aspire proxies to Vite's port
builder.AddViteApp("electron-app", "../electron-app", "dev");
// AddViteApp already registers the correct endpoint
```

`AddViteApp` already handles the endpoint registration internally — don't add `WithHttpEndpoint` manually.

## 3. Don't Double-Register HTTP Endpoints

**Problem:** `AddViteApp` automatically registers an `http` endpoint. Adding `WithHttpEndpoint` creates a duplicate, causing routing confusion.

**Fix:** Trust the built-in registration:

```csharp
// ❌ Wrong — duplicate endpoint
builder.AddViteApp("electron-app", "../electron-app", "dev")
    .WithHttpEndpoint(port: 5173, name: "http");

// ✅ Correct — AddViteApp handles it
builder.AddViteApp("electron-app", "../electron-app", "dev");
```

## 4. Redis Container Requires Docker

**Problem:** `builder.AddRedis("cache")` creates a Redis container. If Docker isn't running, the app fails to start.

**Fix:** Ensure Docker Desktop is running before `dotnet run`. Alternatively, services can fall back to in-memory implementations when Redis isn't available (DJ.ai does this in `RedisDeviceAuthService` and `RedisStateStoreService`).

## 5. Secrets Configuration

**Problem:** Aspire host needs OAuth secrets, but they shouldn't be in `appsettings.json`.

**Fix:** Use `dotnet user-secrets` on the AppHost project:

```bash
cd DJai.AppHost
dotnet user-secrets set "SpotifyClientId" "your-client-id"
dotnet user-secrets set "SpotifyClientSecret" "your-client-secret"
```

The `setup.ps1 --local` script automates this for all providers.

## 6. Port Conflicts

**Problem:** If Vite's port 5173 is already in use, Vite auto-increments to 5174, 5175, etc. But the OAuth callback URL must match.

**Fix:** DJ.ai's `ValidationService` allows ports 5173-5177, and the backend CORS configuration allows the same range. This provides room for port auto-incrementing without breaking OAuth.

## Key Links

- [Build Your First Aspire App](https://learn.microsoft.com/en-us/dotnet/aspire/get-started/build-your-first-aspire-app)
- [Aspire Azure Functions Support](https://learn.microsoft.com/en-us/dotnet/aspire/serverless/functions)
- [Aspire Known Issues](https://github.com/dotnet/aspire/issues)

## Key Takeaways

- Use `AddAzureFunctionsProject` — not `AddProject` — for Functions
- Don't add `WithHttpEndpoint` if the resource type already registers one
- `targetPort` tells Aspire where the service **already** listens
- Docker must be running for container resources (Redis)
- Use `dotnet user-secrets` on the AppHost project for OAuth secrets

## DJ.ai Connection

All these gotchas are documented in the project's `.github/copilot-instructions.md` and `DEV_SETUP.md`. They were discovered during DJ.ai's Aspire integration and represent real issues that new contributors encounter. The `setup.ps1 --local` script in the project root automates secret configuration for the AppHost, and the `ValidationService` in `oauth-proxy/Services/` allows the port range 5173-5177 to accommodate Vite's auto-incrementing behavior.
