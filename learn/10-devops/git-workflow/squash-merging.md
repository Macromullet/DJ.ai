# Squash Merging

## The Concept

**Squash merging** compresses all commits from a feature branch into a single commit on the target branch. Instead of merging 15 messy "WIP", "fix typo", and "actually fix the thing" commits, you get one clean, well-described commit that represents the entire body of work.

### Before Squash Merge (feature branch)

```
a1b2c3 WIP: start onboarding
d4e5f6 add some styles
g7h8i9 fix: typo in wizard
j0k1l2 more progress
m3n4o5 actually works now
p6q7r8 fix review feedback
```

### After Squash Merge (main)

```
x9y0z1 feat: add onboarding wizard with provider selection
```

The feature branch history is preserved in the **pull request** — all individual commits are still visible there. But `main` stays clean and readable.

### Squash Merge vs Other Strategies

| Strategy | Result on main | History |
|----------|---------------|---------|
| **Merge commit** | All branch commits + merge commit | Noisy, but preserves branch topology |
| **Rebase** | All branch commits (rebased) | Linear, but includes WIP commits |
| **Squash merge** | Single commit per feature | Clean, one commit per PR |

## Why DJ.ai Uses Squash Merging

### 1. Clean History

`git log main` reads like a changelog:

```
feat: add onboarding wizard with provider selection
refactor: migrate to design token system
fix: handle OAuth token expiry in Spotify provider
feat: implement AI commentary with Gemini
docs: add ARCHITECTURE.md
```

### 2. Easy Reverts

Need to undo a feature? One commit to revert:

```bash
git revert x9y0z1  # Reverts the entire onboarding feature
```

With a merge commit strategy, reverting means finding and undoing all individual commits.

### 3. Bisect Simplicity

`git bisect` finds bugs faster when each commit is a complete, tested unit of work rather than a WIP checkpoint.

### 4. Freedom to Commit Freely

Developers can commit as often as they want on the branch — "save progress", "debug attempt #3", "revert that" — without worrying about polluting the main history. Squash merge cleans it all up.

### Writing Good Squash Messages

The squash commit message should summarize the entire body of work:

```
feat: add onboarding wizard with provider selection

- Three-step wizard: welcome, provider selection, completion
- OAuth integration for Spotify and Apple Music
- Responsive layout with design token styling
- Keyboard accessible with focus management

Closes #42

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## DJ.ai Connection

Every PR in DJ.ai is squash merged. The PR title (which follows conventional commit format) becomes the commit message on `main`. This means DJ.ai's `main` branch history is a clean, linear sequence where each commit represents a complete, reviewed feature or fix. Individual commit history is always available in the closed PR for forensic analysis.

## Key Takeaways

- Squash merge = one commit per PR = clean `main` branch history
- Individual commits are preserved in the PR, not lost
- Squash makes `git revert` and `git bisect` dramatically simpler
- Write squash messages that summarize the entire body of work, not just the last commit

## Further Reading

- [GitHub: About Pull Request Merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/about-pull-request-merges#squash-and-merge-your-commits)
- [Atlassian: Git Merge vs Rebase vs Squash](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)
