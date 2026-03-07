# GitHub Actions

## The Concept

GitHub Actions is a **CI/CD platform** built directly into GitHub. You define workflows in YAML files that run automatically in response to events — pushes, pull requests, tags, schedules, or manual triggers. Workflows execute in cloud-hosted runners (Linux, macOS, Windows) with full access to your repository.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Workflow** | A YAML file in `.github/workflows/` defining an automated process |
| **Trigger** | The event that starts a workflow (`push`, `pull_request`, `workflow_dispatch`) |
| **Job** | A set of steps that run on the same runner |
| **Step** | A single command or action within a job |
| **Action** | A reusable unit of work (e.g., `actions/checkout@v4`) |
| **Runner** | The virtual machine that executes jobs |

## DJ.ai's GitHub Actions Setup

DJ.ai uses three workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Every push | Build backend, build + typecheck frontend, Electron dry run |
| `deploy-oauth-proxy.yml` | Manual (`workflow_dispatch`) | Deploy to Azure staging → production |
| `release-electron.yml` | Tag push (`v*`) | Build Electron installers for all platforms |

### Why Three Workflows?

- **CI** runs on every commit — fast feedback, catches regressions
- **Deploy** is manual — production deployments need human approval
- **Release** is tag-triggered — version tags initiate the release pipeline

## Learning Path

| File | Topic |
|------|-------|
| [workflows.md](./workflows.md) | Workflow YAML structure and triggers |
| [matrix-builds.md](./matrix-builds.md) | Multi-platform builds |
| [artifacts.md](./artifacts.md) | Storing build outputs and test results |
| [secrets-and-variables.md](./secrets-and-variables.md) | Managing sensitive configuration |

## Key Takeaways

- Workflows are event-driven — they respond to git events, schedules, or manual triggers
- Jobs run in parallel by default; use `needs:` for sequential ordering
- The marketplace has thousands of reusable actions (checkout, setup-node, deploy)
- Separate CI from deployment — different triggers, different approval requirements

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Actions Quickstart](https://docs.github.com/en/actions/quickstart)
