# Matrix Builds

## The Concept

A **matrix strategy** runs the same job multiple times with different configurations — operating systems, language versions, or feature flags. Instead of writing three separate jobs for Windows, macOS, and Linux, you define one job with a matrix and GitHub Actions expands it automatically.

```yaml
strategy:
  matrix:
    os: [windows-latest, macos-latest, ubuntu-latest]
    node-version: [18, 20]
runs-on: ${{ matrix.os }}
```

This produces **6 jobs** (3 OS × 2 Node versions), all running in parallel. Matrix builds are essential for cross-platform applications like desktop apps.

### Key Options

| Option | Purpose |
|--------|---------|
| `matrix:` | Define variable combinations |
| `fail-fast: false` | Don't cancel other jobs when one fails |
| `max-parallel: 2` | Limit concurrent jobs |
| `include:` | Add specific combinations |
| `exclude:` | Remove specific combinations |

## How DJ.ai Uses Matrix Builds

DJ.ai's Electron app must run on Windows, macOS, and Linux. The CI workflow uses a matrix to validate packaging on all three platforms:

```yaml
# From .github/workflows (simplified)
electron-package:
  strategy:
    fail-fast: false
    matrix:
      os: [windows-latest, macos-latest, ubuntu-latest]
  runs-on: ${{ matrix.os }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
    - run: cd electron-app && npm ci
    - run: cd electron-app && npm run electron:build
```

### Why `fail-fast: false`?

By default, GitHub Actions cancels all matrix jobs when any one fails. For cross-platform builds, you want to see **all** failures — a Windows-specific bug shouldn't mask a separate Linux issue.

### Platform-Specific Considerations

```yaml
include:
  - os: macos-latest
    electron_args: '--mac'
  - os: windows-latest
    electron_args: '--win'
  - os: ubuntu-latest
    electron_args: '--linux'
```

The `include` directive lets you add platform-specific parameters to matrix entries, like code-signing certificates or build flags.

### Release Workflow Matrix

The `release-electron.yml` workflow uses the same matrix pattern but uploads platform-specific installers as release assets:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: electron-${{ matrix.os }}
    path: electron-app/dist/
```

## DJ.ai Connection

Matrix builds are critical for DJ.ai because it's an Electron desktop app targeting all three major platforms. The CI pipeline catches platform-specific issues (file path separators, native dependencies, code signing) before they reach users. Each matrix job runs independently on a fresh runner, ensuring no cross-contamination between platforms.

## Key Takeaways

- Matrix strategy multiplies one job definition into many parallel configurations
- Use `fail-fast: false` for cross-platform builds to see all failures
- `include` and `exclude` let you customize specific matrix combinations
- Matrix builds are essential for any application that ships to multiple platforms

## Further Reading

- [GitHub: Using a Matrix for Your Jobs](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [GitHub: Electron Builder Action](https://github.com/samuelmeuli/action-electron-builder)
