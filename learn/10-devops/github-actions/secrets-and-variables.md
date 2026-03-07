# Secrets and Variables

## The Concept

CI/CD workflows often need sensitive data (API keys, certificates, cloud credentials) and non-sensitive configuration (environment names, feature flags). GitHub Actions provides two mechanisms:

- **Secrets** — Encrypted values that are masked in logs. Used for credentials, tokens, and signing keys.
- **Variables** — Plain text configuration. Used for environment names, URLs, and feature flags.

### Security Model

Secrets are encrypted at rest, only decrypted on the runner during workflow execution, and **automatically masked** in logs. If a secret's value appears in output, GitHub replaces it with `***`.

```yaml
steps:
  - run: echo "Token is ${{ secrets.MY_TOKEN }}"
  # Output: "Token is ***"
```

## How DJ.ai Manages Secrets

### Repository Secrets

Available to all workflows in the repository:

| Secret | Purpose |
|--------|---------|
| `AZURE_CLIENT_ID` | Service principal for Azure deployments |
| `AZURE_TENANT_ID` | Azure AD tenant identifier |
| `AZURE_SUBSCRIPTION_ID` | Target Azure subscription |

### Environment Secrets

Scoped to specific deployment environments (staging, production) with optional approval gates:

```yaml
jobs:
  deploy-staging:
    environment: staging  # Uses staging secrets
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### OIDC for Azure (No Stored Passwords)

DJ.ai uses **OpenID Connect (OIDC)** instead of storing Azure passwords. The GitHub runner generates a short-lived token that Azure trusts via federation:

```yaml
permissions:
  id-token: write    # Required for OIDC
  contents: read

steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      # No client-secret needed — OIDC handles auth
```

This is more secure than storing long-lived credentials because:
1. No password to rotate
2. Tokens are valid for minutes, not months
3. Federated trust is scoped to specific repos and branches

### Code Signing Secrets

The Electron release workflow uses platform-specific signing certificates:

```yaml
# macOS code signing
env:
  CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}
  CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
```

## DJ.ai Connection

DJ.ai's deployment workflow uses OIDC federation for Azure authentication — no long-lived secrets stored in GitHub. The `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` identify the service principal, while OIDC provides the actual authentication token at runtime. Code signing secrets are environment-scoped, ensuring they're only accessible during release workflows.

## Key Takeaways

- Never hardcode secrets in workflow files — always use `${{ secrets.NAME }}`
- Prefer OIDC over stored credentials for cloud deployments
- Use environment-scoped secrets for production to require approval gates
- Secrets are masked in logs, but be careful with base64 encoding or transformations

## Further Reading

- [GitHub: Using Secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [GitHub: OIDC for Cloud Deployments](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [Azure: Workload Identity Federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
