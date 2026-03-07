# Workflow YAML

## The Concept

A GitHub Actions workflow is a **YAML file** in `.github/workflows/` that defines what to build, test, or deploy — and when. The YAML structure maps directly to CI/CD concepts: triggers start workflows, jobs define what to do, and steps are the individual commands.

### Anatomy of a Workflow

```yaml
name: CI                           # Human-readable name

on:                                # Triggers
  push:
    branches: [main, 'feature/**']
  pull_request:
    branches: [main]

jobs:
  build:                           # Job ID
    runs-on: ubuntu-latest         # Runner OS
    steps:
      - uses: actions/checkout@v4  # Reusable action
      - run: npm install           # Shell command
      - run: npm test
```

### Trigger Types

| Trigger | When It Fires |
|---------|---------------|
| `push` | Code pushed to matching branches |
| `pull_request` | PR opened, updated, or synchronized |
| `workflow_dispatch` | Manual trigger (button in GitHub UI) |
| `schedule` | Cron schedule (e.g., nightly builds) |
| `release` | Release published or tag pushed |

## DJ.ai's Workflow Structure

### ci.yml — Continuous Integration

Runs on every push to ensure nothing is broken:

```yaml
# Simplified structure of DJ.ai's CI workflow
name: CI
on: [push]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
      - run: dotnet build oauth-proxy/

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd electron-app && npm ci
      - run: cd electron-app && npx tsc --noEmit    # Type check
      - run: cd electron-app && npx vite build       # Production build

  electron-package:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - run: npm run electron:build -- --dry-run
```

### deploy-oauth-proxy.yml — Manual Deployment

Uses `workflow_dispatch` — requires a human to press "Run workflow":

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy target'
        required: true
        default: 'staging'
```

### release-electron.yml — Tag-Triggered Release

Builds distributable packages when a version tag is pushed:

```yaml
on:
  push:
    tags: ['v*']
```

## DJ.ai Connection

The three workflows map to DJ.ai's release flow: `ci.yml` validates every commit, `deploy-oauth-proxy.yml` handles the serverless backend deployment (with Azure OIDC authentication), and `release-electron.yml` produces platform-specific installers. This separation ensures CI is fast (no deployment delays) while deployments have proper approval gates.

## Key Takeaways

- One workflow file per concern (CI, deploy, release) keeps configuration clean
- `workflow_dispatch` gives production deployments a manual approval step
- Use `actions/checkout@v4` and other versioned actions for reproducibility
- Matrix strategy enables multi-platform builds from a single job definition

## Further Reading

- [GitHub: Using Workflows](https://docs.github.com/en/actions/using-workflows)
- [GitHub: Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub: Events That Trigger Workflows](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)
