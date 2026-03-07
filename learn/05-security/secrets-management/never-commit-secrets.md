# Never Commit Secrets

## The Problem

Once a secret is committed to git, it's **permanently in the history** — even if you delete it in the next commit. Force-pushing and rebasing don't reliably remove it from all clones, forks, and caches.

```bash
# ❌ This happened to someone, somewhere, today:
git add .env         # Contains API_KEY=sk-abc123...
git commit -m "add config"
git push

# Realizing the mistake:
git rm .env
git commit -m "oops, remove secrets"
# ⚠️ SECRET IS STILL IN HISTORY: git show HEAD~1:.env
```

## Prevention Strategies

### 1. `.gitignore`

The first line of defense. DJ.ai ignores all secret-containing files:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# .NET user-secrets (stored outside project, but just in case)
secrets.json

# IDE-specific
.idea/
.vscode/settings.json
```

### 2. Secret File Patterns

DJ.ai uses a tiered approach to avoid secrets in the repository:

| Tier | Mechanism | Location | In Git? |
|------|-----------|----------|---------|
| **Frontend config** | `.env.local` | `electron-app/.env.local` | ❌ gitignored |
| **Backend dev secrets** | `dotnet user-secrets` | `~/.microsoft/usersecrets/` | ❌ Outside repo |
| **Backend prod secrets** | Azure Key Vault | Azure cloud | ❌ Not on disk |
| **CI secrets** | `StubSecretService` | In-memory stubs | ✅ No real values |

### 3. GitHub Secret Scanning

GitHub automatically scans pushed commits for known secret patterns (API keys, tokens, connection strings) and alerts the repository owner:

- Scans every push to all branches
- Detects patterns from 200+ service providers
- Can block pushes with push protection enabled
- Partners are notified to revoke compromised tokens

### 4. Pre-Commit Hooks

Add a pre-commit hook to scan for secrets before they reach git:

```bash
# Example using git-secrets or gitleaks
# .git/hooks/pre-commit
gitleaks detect --source . --verbose
```

## What to Do If a Secret Is Committed

1. **Revoke the secret immediately** — generate a new one
2. **Remove from history** using `git filter-repo` or BFG Repo-Cleaner
3. **Force push** to all branches
4. **Notify team** to re-clone (their local copies still have the old history)
5. **Check for exposure** — was the repo public? Was the secret used?

```bash
# Using BFG Repo-Cleaner (faster than filter-branch)
bfg --replace-text secrets.txt repo.git
cd repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
```

## DJ.ai Source Files

| File | Role |
|------|------|
| `.gitignore` | Excludes `.env`, `.env.local`, build artifacts |
| `scripts/setup-local.ps1` | Stores secrets via `dotnet user-secrets` (outside repo) |
| `scripts/setup-cloud.ps1` | Stores secrets in Azure Key Vault (not on disk) |
| `oauth-proxy/Services/StubSecretService.cs` | Provides fake secrets for CI/testing |

## Key Takeaways

- **Secrets in git history are permanent** — prevention is the only reliable strategy
- Use `.gitignore` for all secret-containing files
- Store secrets **outside the repository**: user-secrets, Key Vault, CI secret stores
- Enable GitHub secret scanning and push protection
- If a secret is committed: **revoke first**, clean history second
- DJ.ai uses three tiers: `.env.local` (frontend dev), `dotnet user-secrets` (backend dev), Azure Key Vault (production)

## References

- [GitHub — About Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)
- [OWASP — Secrets in Source Code](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [git-secrets](https://github.com/awslabs/git-secrets) — AWS tool for preventing secret commits
