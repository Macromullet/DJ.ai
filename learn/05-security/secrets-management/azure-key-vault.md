# Azure Key Vault

## What Is Azure Key Vault?

Azure Key Vault is a cloud service for securely storing and managing **secrets**, **keys**, and **certificates**. It provides:

- **Encryption at rest** using hardware security modules (HSMs)
- **Role-Based Access Control (RBAC)** — fine-grained permissions per secret
- **Audit logging** — every access is recorded in Azure Monitor
- **Automatic rotation** — secrets can be rotated without code changes
- **Managed Identity** — no credentials needed to access the vault

## How DJ.ai Uses Key Vault

In production, the OAuth proxy reads all provider credentials from Azure Key Vault using **Managed Identity** (no credentials in config):

```csharp
// oauth-proxy/Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri($"https://{vaultName}.vault.azure.net/"),
    new DefaultAzureCredential()  // Uses Managed Identity in Azure
);
```

### Secrets Stored in Key Vault

| Secret Name | Purpose |
|-------------|---------|
| `Spotify--ClientId` | Spotify OAuth client ID |
| `Spotify--ClientSecret` | Spotify OAuth client secret |
| `AppleMusic--TeamId` | Apple Developer Team ID |
| `AppleMusic--KeyId` | Apple Music API Key ID |
| `AppleMusic--PrivateKey` | Apple Music ES256 signing key |

(Azure Key Vault uses `--` as separator instead of `:` for nested configuration keys)

## DJ.ai Source Files

| File | Role |
|------|------|
| `scripts/setup-cloud.ps1` | Interactive script to configure Key Vault secrets via Azure CLI |
| `oauth-proxy/Program.cs` | Adds Key Vault as configuration source with DefaultAzureCredential |
| `infra/` | Bicep IaC modules for provisioning Key Vault and assigning RBAC |
| `azure.yaml` | Azure Developer CLI configuration |

### How `setup.ps1 --cloud` Works

```
1. Reads azd environment to find Key Vault name
2. Authenticates via Azure CLI (az login)
3. Prompts for each secret value
4. Runs: az keyvault secret set --vault-name $vault --name "Spotify--ClientId" --value "..."
5. Verifies all secrets are set
```

## Managed Identity

Instead of storing a Key Vault access key (another secret!), DJ.ai uses **Managed Identity**:

```
Traditional:
  App → needs access key → to read Key Vault → which has secrets
  ⚠️ Where do you store the access key?

Managed Identity:
  App → Azure automatically provides identity → Key Vault trusts the identity
  ✅ No credentials to manage
```

In development, `DefaultAzureCredential` falls back to:
1. Environment variables
2. Managed Identity (in Azure)
3. Azure CLI (`az login`)
4. Visual Studio credentials

## Key Vault Best Practices

| Practice | Why |
|----------|-----|
| Use Managed Identity | Eliminates credential management |
| Enable soft-delete | Recover accidentally deleted secrets |
| Enable purge protection | Prevent permanent deletion for 90 days |
| Rotate secrets regularly | Limits exposure window if compromised |
| Use RBAC (not access policies) | Granular, Azure AD-integrated permissions |
| Monitor access logs | Detect unauthorized access attempts |

## Key Takeaways

- Key Vault is the **production** secret store — encrypted, access-controlled, audit-logged
- Use **Managed Identity** to access Key Vault without storing credentials
- `DefaultAzureCredential` provides a fallback chain from Managed Identity to local dev tools
- Run `.\setup.ps1 --cloud` to configure secrets for production
- Infrastructure (Key Vault, RBAC) is defined in `infra/` Bicep templates

## References

- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [DefaultAzureCredential](https://learn.microsoft.com/en-us/dotnet/api/azure.identity.defaultazurecredential)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
