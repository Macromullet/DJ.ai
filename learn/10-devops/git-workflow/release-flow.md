# Release Flow

## The Concept

**Release Flow** is a branching strategy developed by the Azure DevOps team (formerly VSTS) that balances simplicity with control. It's simpler than Git Flow but more structured than trunk-based development. The core idea: `main` is always deployable, work happens on short-lived branches, and everything flows through pull requests.

### The Flow

```
main ─────●─────────────●───────────────●─── (always deployable)
           \           /                 \
            ● feature/  ── squash merge   ● fix/
            ● branch                      ● branch
            ●                             ●
```

### Step by Step

**1. Create an Issue**

Every piece of work starts with a GitHub Issue. This creates a paper trail — why was this change made? Who requested it? What was the acceptance criteria?

**2. Branch from `main`**

```bash
git checkout main
git pull origin main
git checkout -b feature/onboarding
```

Branch names follow conventions: `feature/`, `fix/`, `refactor/`, `docs/`.

**3. Work on the Branch**

Commit early and often. Messy commits are fine — they'll be squashed later:

```bash
git commit -m "feat: add onboarding wizard skeleton"
git commit -m "feat: implement provider selection step"
git commit -m "fix: handle edge case in OAuth callback"
```

**4. Create a Pull Request**

Push the branch and open a PR targeting `main`. Link it to the issue:

```bash
git push origin feature/onboarding
# Then create PR via GitHub UI or CLI
```

**5. Code Review**

Every PR gets reviewed before merge — even AI-written code gets an agent review. DJ.ai uses Mixture-of-Experts (MOE) review with multiple AI models checking different concerns in parallel.

**6. Squash Merge**

Compress all branch commits into a single, well-described commit on `main`:

```
feat: add onboarding wizard with provider selection

- Three-step wizard: welcome, provider selection, completion
- OAuth integration for YouTube, Spotify, Apple Music
- Responsive layout with design token styling
- Keyboard accessible with focus management

Closes #42
```

**7. Delete the Branch**

```bash
git branch -d feature/onboarding
git push origin --delete feature/onboarding
```

## DJ.ai Connection

Every piece of work in DJ.ai follows this exact flow — the onboarding wizard, OAuth implementation, design system, CI/CD setup — all went through issue → branch → PR → review → squash merge. This creates a clean, readable `main` branch history where each commit represents a complete, reviewed body of work.

## Key Takeaways

- `main` must always be deployable — never merge broken code
- Short-lived branches reduce merge conflicts
- Issues create accountability and traceability
- Squash merge produces clean history without losing branch-level detail (it's in the PR)

## Further Reading

- [Release Flow: How We Do Branching](https://devblogs.microsoft.com/devops/release-flow-how-we-do-branching-on-the-vsts-team/)
- [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Trunk-Based Development](https://trunkbaseddevelopment.com/)
