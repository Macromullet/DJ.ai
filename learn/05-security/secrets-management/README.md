# Secrets Management

## The Golden Rule

> **Secrets must never appear in source code, config files, environment variables checked into git, or client-side bundles.**

A secret is anything that grants access: API keys, client secrets, database connection strings, signing keys, tokens. If a secret leaks, the attacker has the same access as the legitimate holder.

## DJ.ai's Three-Tier Model

DJ.ai uses different secret storage mechanisms for different environments:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Development   │     │    Testing/CI    │     │   Production    │
│                 │     │                  │     │                 │
│  dotnet         │     │  StubSecret      │     │  Azure Key      │
│  user-secrets   │     │  Service         │     │  Vault          │
│                 │     │                  │     │                 │
│  ~/.microsoft/  │     │  Fake values     │     │  Encrypted,     │
│  usersecrets/   │     │  No real secrets │     │  RBAC,          │
│                 │     │  needed          │     │  audit-logged   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Topics in This Section

| File | What You'll Learn |
|------|-------------------|
| [dotnet-user-secrets.md](dotnet-user-secrets.md) | Local development secret storage |
| [azure-key-vault.md](azure-key-vault.md) | Production secret management |
| [never-commit-secrets.md](never-commit-secrets.md) | Prevention strategies and scanning |

## DJ.ai Source Files

| File | Role |
|------|------|
| `oauth-proxy/Services/ISecretService.cs` | Interface for retrieving secrets |
| `oauth-proxy/Services/StubSecretService.cs` | Fake implementation for testing |
| `oauth-proxy/Program.cs` | Selects secret provider based on environment |
| `scripts/setup-local.ps1` | Interactive wizard for configuring user-secrets |
| `scripts/setup-cloud.ps1` | Configures Azure Key Vault via Azure CLI |
| `setup.ps1` | Entry point — delegates to local or cloud setup |

## Key Takeaways

- Use **tiered secret storage**: user-secrets (dev) → stubs (CI) → Key Vault (prod)
- Never commit secrets — use `.gitignore`, pre-commit hooks, and secret scanning
- The `ISecretService` abstraction lets DJ.ai swap secret providers without changing business logic
- Run `setup.ps1 --local` for development, `setup.ps1 --cloud` for production

## References

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12-Factor App — Config](https://12factor.net/config)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)
