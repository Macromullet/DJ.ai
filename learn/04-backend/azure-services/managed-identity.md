# Managed Identity

## What Is Managed Identity?

Managed Identity eliminates the need to store credentials in code or configuration. Instead of using connection strings with passwords, your Azure resource authenticates to other Azure services using an automatically managed identity — Microsoft handles the credential lifecycle.

```
Traditional:  App → "password=abc123" → Key Vault
Managed ID:   App → "I am this Azure Function" → Azure AD → Key Vault
```

## Types of Managed Identity

| Type | Scope | Lifecycle |
|------|-------|-----------|
| **System-assigned** | Tied to one Azure resource | Created/deleted with the resource |
| **User-assigned** | Independent Azure resource | Shared across multiple resources |

DJ.ai uses **system-assigned** managed identity — the simplest option when each Functions app needs its own identity.

## How It Works

1. Azure automatically creates an identity (service principal) for your Functions app
2. You grant that identity **RBAC roles** on target resources (e.g., "Key Vault Secrets User")
3. Your code uses `DefaultAzureCredential` which automatically discovers the managed identity
4. Azure AD issues short-lived tokens — no passwords stored anywhere

```csharp
// This single line handles ALL authentication scenarios
var credential = new DefaultAzureCredential();

// It tries (in order):
// 1. Environment variables (CI/CD)
// 2. Managed Identity (Azure)
// 3. Visual Studio credential (development)
// 4. Azure CLI credential (development)
// 5. Azure PowerShell credential (development)
```

## Configuring in DJ.ai

```csharp
// oauth-proxy/Program.cs — production path
var keyVaultUrl = context.Configuration["KeyVaultUrl"]
    ?? throw new Exception("KeyVaultUrl not configured");

var secretClient = new SecretClient(
    new Uri(keyVaultUrl),
    new DefaultAzureCredential()  // Managed Identity in Azure, CLI cred locally
);

services.AddSingleton(secretClient);
services.AddSingleton<ISecretService, KeyVaultSecretService>();
```

## RBAC Role Assignment

The Functions app's managed identity needs the `Key Vault Secrets User` role:

```bash
# Using Azure CLI
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <managed-identity-principal-id> \
  --scope /subscriptions/.../resourceGroups/.../providers/Microsoft.KeyVault/vaults/...
```

DJ.ai's Bicep templates in `infra/` handle this automatically.

## Key Links

- [Managed Identity Overview](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [DefaultAzureCredential](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential)
- [Key Vault RBAC](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)

## Key Takeaways

- Managed Identity means **zero credentials** in code or config
- `DefaultAzureCredential` automatically picks the right auth method per environment
- System-assigned identity is **tied to the resource** — deleted when the resource is deleted
- Grant **least-privilege RBAC roles** (e.g., "Secrets User", not "Contributor")

## DJ.ai Connection

DJ.ai's Functions app uses system-assigned managed identity to authenticate to Azure Key Vault. In `oauth-proxy/Program.cs`, the production code path creates a `SecretClient` with `DefaultAzureCredential()`. In Azure, this resolves to the managed identity. During local development, the same `DefaultAzureCredential` falls back to Azure CLI or Visual Studio credentials — but DJ.ai typically uses the `LocalSecretService` path instead, reading from `dotnet user-secrets`. The Bicep IaC in `infra/` provisions the managed identity and assigns the Key Vault Secrets User role automatically.
