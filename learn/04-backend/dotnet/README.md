# .NET 8 Fundamentals

## Overview

.NET 8 is Microsoft's latest Long-Term Support (LTS) runtime — the foundation for DJ.ai's backend. While the backend is serverless (Azure Functions), it still uses core .NET patterns: dependency injection, configuration, and HTTP clients. Understanding these patterns is essential for working with the `oauth-proxy` project.

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [Dependency Injection](./dependency-injection.md) | Service registration and lifetimes |
| [Configuration](./configuration.md) | Secrets, settings, and environment variables |
| [HttpClient Factory](./http-client-factory.md) | Making HTTP calls to OAuth providers |

## Why .NET for This Project?

DJ.ai's backend could have been written in any language, but .NET offers specific advantages:

1. **Azure-native** — first-class support for Azure Functions, Key Vault, and Managed Identity
2. **Aspire integration** — .NET Aspire orchestrates the full development environment
3. **Type safety** — C# catches errors at compile time, important for security-critical OAuth code
4. **Performance** — .NET 8's AOT compilation and minimal APIs are well-suited for serverless

## Key Patterns Used

The backend uses three core .NET patterns repeatedly:

```csharp
// 1. Dependency Injection — register services once, use everywhere
services.AddSingleton<ISecretService, KeyVaultSecretService>();

// 2. Configuration — read secrets from multiple sources
var keyVaultUrl = context.Configuration["KeyVaultUrl"];

// 3. HttpClient — make outbound HTTP calls safely
services.AddHttpClient();
```

## Key Links

- [.NET 8 Documentation](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8)
- [C# Language Reference](https://learn.microsoft.com/en-us/dotnet/csharp/)

## DJ.ai Connection

The .NET 8 runtime powers the entire `oauth-proxy/` project. `Program.cs` wires up dependency injection, the `Functions/` directory contains HTTP-triggered Azure Functions, and `Services/` implements business logic behind interfaces. The project targets `net8.0` and uses the isolated worker model for Azure Functions, meaning it runs in its own process separate from the Azure Functions host.
