# Client Secret Protection

## The Core Problem

OAuth 2.0 defines two types of clients:

| Type | Can Hold Secrets? | Examples |
|------|-------------------|----------|
| **Confidential** | ✅ Yes | Server-side web apps, backend services |
| **Public** | ❌ No | Mobile apps, desktop apps, SPAs |

DJ.ai is a **desktop application** — a public client. Users can decompile the binary, inspect the Electron `asar` archive, or attach a debugger. Any secret embedded in the app is **not secret**.

```
❌ NEVER DO THIS:
const CLIENT_SECRET = "sk-abc123...";  // Visible to anyone who unzips the app
```

## DJ.ai's Solution: Backend Proxy Pattern

Instead of embedding the client secret in the Electron app, DJ.ai uses a backend Azure Functions proxy that holds the secret in Azure Key Vault:

```
┌──────────────┐                     ┌──────────────┐                    ┌──────────────┐
│  Electron    │  code + redirect_uri│  OAuth Proxy │  code + secret     │  Spotify     │
│  (no secret) │ ──────────────────► │  (has secret)│ ─────────────────► │  Token API   │
│              │                     │              │                    │              │
│              │  access_token       │  Reads secret│  access_token      │              │
│              │ ◄────────────────── │  from Key    │ ◄───────────────── │              │
└──────────────┘                     │  Vault       │                    └──────────────┘
                                     └──────────────┘
```

### What the Backend Handles

The OAuth proxy handles **only** secret-requiring operations:

| Endpoint | Purpose | Needs Secret? |
|----------|---------|---------------|
| `/oauth/{provider}/initiate` | Build auth URL | ✅ Includes client_id from Key Vault |
| `/oauth/{provider}/exchange` | Code → tokens | ✅ Sends client_secret to provider |
| `/oauth/{provider}/refresh` | Refresh tokens | ✅ Sends client_secret to provider |

**Everything else** (search, playback, user data) goes directly from the Electron app to the music provider using the access token — no proxy needed.

## DJ.ai Source Files

| File | Role |
|------|------|
| `oauth-proxy/Services/ISecretService.cs` | Interface for retrieving OAuth credentials |
| `oauth-proxy/Program.cs` | Configures Key Vault or user-secrets as secret source |
| `oauth-proxy/Functions/SpotifyOAuthFunctions.cs` | Reads client secret from ISecretService before token exchange |
| `scripts/setup-local.ps1` | Configures `dotnet user-secrets` for local dev |
| `scripts/setup-cloud.ps1` | Configures Azure Key Vault for production |

### Three Tiers of Secret Storage

```
Development:  dotnet user-secrets → ~/.microsoft/usersecrets/<id>/secrets.json
Testing:      StubSecretService   → fake values (no real secrets needed)
Production:   Azure Key Vault     → encrypted, RBAC-controlled, audit-logged
```

## Key Takeaways

- Desktop apps are public clients — **never embed client secrets** in the binary
- Use a backend proxy for all operations that require the client secret
- The proxy pattern minimizes the backend's role: it's not a full API proxy, just a secret handler
- Azure Key Vault provides encryption, access control, and audit logging for production secrets
- Local development uses `dotnet user-secrets` (never committed to git)

## References

- [RFC 6749 §2.1 — Client Types](https://datatracker.ietf.org/doc/html/rfc6749#section-2.1)
- [OWASP — Insufficient Credential Protection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/04-Authentication_Testing/04-Testing_for_Weak_Security_Question_Answer)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
