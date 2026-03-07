# Managed Identity & Workload Identity Federation

## The Concept

**Managed Identity** is Azure's way of giving applications an identity without passwords. Instead of storing connection strings or API keys, your app authenticates to Azure services using its identity — Azure handles the credential lifecycle automatically.

**Workload Identity Federation** extends this concept to **external systems** like GitHub Actions. Instead of storing Azure credentials as GitHub secrets, GitHub generates a short-lived OIDC token that Azure trusts directly.

### The Trust Chain

```
GitHub Actions Runner
  → Generates OIDC JWT token (short-lived, scoped to repo/branch)
  → Sends token to Azure AD
  → Azure AD validates via federated credential trust
  → Issues Azure access token
  → Runner authenticates to Azure resources
```

No passwords. No secrets to rotate. No long-lived credentials to leak.

### Types of Managed Identity

| Type | Description | Use Case |
|------|-------------|----------|
| **System-assigned** | Tied to a single resource, deleted with it | Function App → Key Vault |
| **User-assigned** | Independent resource, can be shared | Multiple apps → same Key Vault |

## How DJ.ai Uses Managed Identity

### Function App → Key Vault (Runtime)

The OAuth proxy Function App uses a **system-assigned managed identity** to read client secrets from Key Vault:

```csharp
// No connection strings or passwords needed
var credential = new DefaultAzureCredential();
var client = new SecretClient(
    new Uri("https://djai-keyvault.vault.azure.net/"),
    credential
);
var secret = await client.GetSecretAsync("Spotify-ClientSecret");
```

Azure handles authentication transparently — the Function App's identity is pre-authorized in Key Vault's access policies.

### GitHub Actions → Azure (Deployment)

DJ.ai's deployment workflow uses **workload identity federation** for passwordless Azure deployments:

```yaml
# .github/workflows/deploy-oauth-proxy.yml
permissions:
  id-token: write    # Allow OIDC token generation
  contents: read

steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      # No client-secret — OIDC federation authenticates the runner
```

### Setting Up Federation

The trust relationship is configured in Azure AD:

```
Azure AD App Registration
  → Federated Credentials
    → Issuer: https://token.actions.githubusercontent.com
    → Subject: repo:owner/DJ.ai:ref:refs/heads/main
    → Audience: api://AzureADTokenExchange
```

This means **only** the DJ.ai repository's `main` branch can authenticate as this service principal.

## DJ.ai Connection

DJ.ai uses managed identity at two levels: the Function App authenticates to Key Vault at runtime without any stored credentials, and GitHub Actions authenticates to Azure during deployment using OIDC federation. This eliminates all stored passwords from the system — Key Vault secrets are protected by identity, not by more secrets.

## Key Takeaways

- Managed Identity eliminates stored credentials for Azure service-to-service auth
- Workload Identity Federation extends passwordless auth to external CI/CD systems
- OIDC tokens are short-lived (minutes) and scoped to specific repos/branches
- Always prefer identity-based auth over connection strings and API keys

## Further Reading

- [Workload Identity Federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [Managed Identity Overview](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview)
- [GitHub: OIDC for Azure](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)
