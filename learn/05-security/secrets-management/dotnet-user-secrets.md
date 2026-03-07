# dotnet user-secrets

## What Is the Secret Manager?

The .NET Secret Manager tool stores sensitive data during **local development** outside of the project tree. Secrets are stored in a JSON file in the user's profile directory — never in the project folder, never in source control.

```
Secrets location:
  Windows: %APPDATA%\Microsoft\UserSecrets\<UserSecretsId>\secrets.json
  macOS:   ~/.microsoft/usersecrets/<UserSecretsId>/secrets.json
  Linux:   ~/.microsoft/usersecrets/<UserSecretsId>/secrets.json
```

## How It Works

### 1. Project Configuration

The project file must declare a `<UserSecretsId>`:

```xml
<!-- oauth-proxy/oauth-proxy.csproj -->
<PropertyGroup>
  <UserSecretsId>djai-oauth-proxy</UserSecretsId>
</PropertyGroup>
```

### 2. Setting Secrets

```bash
cd oauth-proxy
dotnet user-secrets set "Google:ClientId" "123456789.apps.googleusercontent.com"
dotnet user-secrets set "Google:ClientSecret" "GOCSPX-..."
dotnet user-secrets set "Spotify:ClientId" "abc123..."
dotnet user-secrets set "Spotify:ClientSecret" "def456..."
```

### 3. Reading Secrets in Code

```csharp
// oauth-proxy/Program.cs
builder.Configuration.AddUserSecrets<Program>();

// Secrets are available via IConfiguration:
var clientId = configuration["Google:ClientId"];
var clientSecret = configuration["Google:ClientSecret"];
```

## DJ.ai Implementation

| File | Role |
|------|------|
| `scripts/setup-local.ps1` | Interactive wizard that runs `dotnet user-secrets set` for each provider |
| `oauth-proxy/Program.cs` | Registers user-secrets as a configuration source |
| `oauth-proxy/Services/ISecretService.cs` | Reads secrets via IConfiguration |
| `DJai.AppHost/` | Aspire injects user-secrets into the oauth-proxy project automatically |

### What `setup.ps1 --local` Configures

The interactive setup script prompts for:

| Secret Key | Description |
|------------|-------------|
| `Google:ClientId` | YouTube/Google OAuth client ID |
| `Google:ClientSecret` | YouTube/Google OAuth client secret |
| `Spotify:ClientId` | Spotify OAuth client ID |
| `Spotify:ClientSecret` | Spotify OAuth client secret |
| `AppleMusic:TeamId` | Apple Developer Team ID |
| `AppleMusic:KeyId` | Apple Music API Key ID |
| `AppleMusic:PrivateKey` | Apple Music ES256 private key |

### Aspire Integration

When running with `dotnet run` in `DJai.AppHost/`, Aspire automatically injects user-secrets into child projects. No environment variables or `.env` files needed.

## Security Properties

| Property | Status |
|----------|--------|
| Stored outside project tree | ✅ Won't be committed to git |
| Encrypted at rest | ❌ Plaintext JSON (dev-only, acceptable) |
| Per-user isolation | ✅ Only accessible to the current user |
| Production-suitable | ❌ Use Azure Key Vault for production |

## Key Takeaways

- User-secrets keep development credentials **out of source code**
- They're stored in `~/.microsoft/usersecrets/` — not in the project directory
- They're **not encrypted** — this is a development tool, not a production secret store
- Run `.\setup.ps1 --local` to configure secrets interactively for DJ.ai
- Aspire automatically injects user-secrets into orchestrated projects

## References

- [Microsoft — Safe Storage of App Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
