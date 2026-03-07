# Git Workflow

## The Concept

A git workflow defines **how a team uses branches, pull requests, and merges** to collaborate on code. Without an agreed-upon workflow, branches accumulate, merges conflict, and the `main` branch becomes unreliable.

Common workflows include:

| Workflow | Complexity | Best For |
|----------|-----------|----------|
| **Trunk-based** | Low | Small teams, continuous deployment |
| **GitHub Flow** | Low-Medium | Web apps with frequent releases |
| **Release Flow** | Medium | Products with staged deployments |
| **Git Flow** | High | Products with scheduled releases |

## DJ.ai's Approach: Release Flow

DJ.ai follows **Release Flow** — a streamlined workflow where every piece of work follows the same path:

```
Issue → Feature Branch → Pull Request → Review → Squash Merge → Delete Branch
```

### The Seven Steps

1. **Create a GitHub Issue** — Describe the work (bug, feature, refactor)
2. **Create a feature branch** from `main` — `feature/onboarding`, `fix/oauth-race`
3. **Do the work** — Commit early and often with conventional commits
4. **Create a Pull Request** — Link it to the issue
5. **Code review** — AI and/or human review
6. **Squash merge** to `main` — One clean commit per body of work
7. **Delete the feature branch** — Keep the branch list clean

### Branch Naming Convention

```
feature/<name>    — New functionality
fix/<name>        — Bug fixes
refactor/<name>   — Code restructuring
docs/<name>       — Documentation changes
```

## Learning Path

| File | Topic |
|------|-------|
| [release-flow.md](./release-flow.md) | The complete Release Flow workflow |
| [conventional-commits.md](./conventional-commits.md) | Commit message format |
| [squash-merging.md](./squash-merging.md) | Why squash merge matters |

## Key Takeaways

- A consistent workflow prevents branch chaos and merge conflicts
- Every change starts with an issue and ends with a squash merge
- Feature branches are short-lived — merge often, delete after
- `main` should always be deployable

## Further Reading

- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Atlassian: Git Workflows](https://www.atlassian.com/git/tutorials/comparing-workflows)
