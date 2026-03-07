# 10 — DevOps

## What Is DevOps?

DevOps is the practice of **unifying software development (Dev) and IT operations (Ops)** through automation, continuous delivery, and infrastructure as code. The goal: ship reliable software faster by automating everything between a developer's commit and production deployment.

Core DevOps practices:

1. **Continuous Integration (CI)** — Automatically build and test every commit
2. **Continuous Deployment (CD)** — Automatically deploy passing builds to environments
3. **Infrastructure as Code (IaC)** — Define cloud resources in version-controlled files
4. **Monitoring & Observability** — Know what's happening in production

## How DJ.ai Practices DevOps

DJ.ai implements DevOps across three dimensions:

### CI/CD with GitHub Actions

```
Push to any branch → ci.yml runs:
  ├── Backend: dotnet build
  ├── Frontend: tsc --noEmit + vite build
  └── Electron: package dry run (Windows, macOS, Linux)

Tag push (v*) → release-electron.yml:
  └── Build distributable installers for all platforms

Manual trigger → deploy-oauth-proxy.yml:
  └── Deploy to Azure (staging → approval → production)
```

### Infrastructure as Code with Bicep

All Azure resources are defined in `infra/` as Bicep modules — Function App, Key Vault, Application Insights, Redis Cache. Changes to infrastructure go through the same PR review process as application code.

### Git Workflow

Every body of work follows **Release Flow**: issue → feature branch → PR → review → squash merge → delete branch. Commits use conventional format (`feat:`, `fix:`, `docs:`).

## Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [GitHub Actions](./github-actions/) | CI/CD workflows, matrix builds, secrets |
| 2 | [Azure Deployment](./azure-deployment/) | Bicep, azd, managed identity |
| 3 | [Git Workflow](./git-workflow/) | Release flow, conventional commits, squash merge |

## Key Takeaways

- Automate builds, tests, and deployments — manual processes are error-prone
- Infrastructure should be version-controlled alongside application code
- A consistent git workflow (issue → branch → PR → merge) prevents chaos
- Every commit should leave `main` in a deployable state

## Further Reading

- [GitHub: DevOps Guide](https://resources.github.com/devops/)
- [The Phoenix Project](https://itrevolution.com/product/the-phoenix-project/) (book)
- [DORA Metrics](https://dora.dev/research/)
