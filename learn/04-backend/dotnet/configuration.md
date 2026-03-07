# Configuration in .NET

## How Configuration Works

.NET's configuration system (`IConfiguration`) aggregates settings from multiple sources into a single, unified key-value store. Sources are layered with later sources overriding earlier ones:

```
appsettings.json          (lowest priority)
    ↓
appsettings.{Env}.json
    ↓
User Secrets              (local dev only)
    ↓
Environment Variables
    ↓
Command-line args         (highest priority)
```

## User Secrets (Local Development)

`dotnet user-secrets` stores sensitive values **outside** the project directory, in a per-user OS location. This prevents accidental commits of secrets:

```bash
# Initialize user secrets for the project
cd oauth-proxy
dotnet user-secrets init

# Set a secret
dotnet user-secrets set "SpotifyClientId" "your-client-id-here"
dotnet user-secrets set "SpotifyClientSecret" "your-client-secret-here"

# List all secrets
dotnet user-secrets list
```

Secrets are stored in:
- **Windows**: `%APPDATA%\Microsoft\UserSecrets\{id}\secrets.json`
- **macOS/Linux**: `~/.microsoft/usersecrets/{id}/secrets.json`

## Reading Configuration

```csharp
// In Program.cs — ConfigureServices has access to IConfiguration
.ConfigureServices((context, services) =>
{
    // Read from any configured source
    var keyVaultUrl = context.Configuration["KeyVaultUrl"];
    var environment = context.Configuration["AZURE_FUNCTIONS_ENVIRONMENT"];
    var redisConnection = context.Configuration.GetConnectionString("cache");
})
```

The configuration system doesn't care where the value comes from — user secrets, environment variables, or `appsettings.json` all work through the same `IConfiguration` interface.

## Environment Variables in Azure

In production, configuration comes from environment variables and Azure App Settings:

```csharp
// Set via Azure Portal, Bicep IaC, or Aspire
var isLocal = context.Configuration["AZURE_FUNCTIONS_ENVIRONMENT"] == "Development";
```

DJ.ai's Aspire host passes secrets as environment variables:

```csharp
// DJai.AppHost/Program.cs
var oauthProxy = builder.AddAzureFunctionsProject<Projects.DJai_OAuthProxy>("oauth-proxy")
    .WithEnvironment("SpotifyClientId", spotifyClientId)
    .WithEnvironment("SpotifyClientSecret", spotifyClientSecret);
```

## Key Links

- [Configuration in .NET](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration)
- [Safe Storage of Secrets (User Secrets)](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets)
- [Environment Variables Configuration](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration-providers#environment-variable-configuration-provider)

## Key Takeaways

- Configuration sources are **layered** — environment variables override appsettings.json
- **User secrets** keep sensitive data out of source control during development
- `IConfiguration` provides a **unified interface** regardless of the source
- In Azure, use **App Settings** (which become environment variables)
- Never hardcode secrets — always use configuration

## DJ.ai Connection

DJ.ai provides two setup paths: `.\setup.ps1 --local` configures `dotnet user-secrets` for local development, and `.\setup.ps1 --cloud` configures Azure Key Vault for production. The `LocalSecretService` in `oauth-proxy/Services/` reads from `IConfiguration` (which includes user secrets), while `KeyVaultSecretService` reads directly from Azure Key Vault. Aspire injects secrets as environment variables from its own configuration, bridging the gap between local secrets and the running Functions app.
