# C#

> DJ.ai's backend language — .NET 8 powers the OAuth proxy Azure Functions.

C# is a modern, object-oriented language running on the .NET runtime. DJ.ai uses C# for the `oauth-proxy` backend — a set of Azure Functions that handle OAuth token exchange with music providers. The backend is intentionally thin: it protects client secrets stored in Azure Key Vault and performs token operations, while all music API calls go directly from the Electron app to providers.

---

## Why DJ.ai Uses C#

1. **Azure Functions native support** — first-class .NET isolated worker model with dependency injection
2. **Azure Key Vault SDK** — seamless integration with `Azure.Security.KeyVault.Secrets` and Managed Identity
3. **Async-first** — `Task<T>` and `async/await` are built into the language and runtime
4. **Strong DI framework** — `Microsoft.Extensions.DependencyInjection` provides enterprise-grade IoC
5. **Aspire orchestration** — .NET Aspire natively manages C# projects alongside Node.js apps

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Async/Await](./async-await.md) | Task-based async, ConfigureAwait, cancellation tokens |
| 2 | [Dependency Injection](./dependency-injection.md) | Service lifetimes, registration, resolution |
| 3 | [Records & Patterns](./records-and-patterns.md) | Record types, pattern matching, switch expressions |

---

## 🔗 DJ.ai Connection

| File | C# Usage |
|------|----------|
| `oauth-proxy/Program.cs` | DI registration, service lifetimes, conditional configuration |
| `oauth-proxy/Functions/*.cs` | Async HTTP-triggered Azure Functions |
| `oauth-proxy/Services/*.cs` | ISecretService, IDeviceAuthService, IStateStoreService |
| `oauth-proxy/Models/OAuthModels.cs` | Record types for DTOs |
| `DJai.AppHost/Program.cs` | Aspire orchestration host |

---

## 📖 Resources

- [C# Documentation](https://learn.microsoft.com/en-us/dotnet/csharp/) — Official Microsoft docs
- [C# Fundamentals](https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/) — Tour of C#
- [.NET 8 What's New](https://learn.microsoft.com/en-us/dotnet/core/whats-new/dotnet-8) — Latest runtime features
