# Artifacts

## The Concept

GitHub Actions artifacts are **files produced during a workflow** that you want to persist after the job completes. Without artifacts, everything on a runner is deleted when the job finishes. Common artifacts include:

- **Build outputs** — Compiled binaries, bundled packages, installers
- **Test results** — JUnit XML, coverage reports, screenshots
- **Logs** — Diagnostic information for debugging failures

Artifacts are uploaded during a workflow and can be downloaded from the GitHub UI or by subsequent jobs in the same workflow.

### Upload and Download

```yaml
# Upload artifacts after building
- uses: actions/upload-artifact@v4
  with:
    name: my-build
    path: dist/
    retention-days: 30

# Download in a later job
- uses: actions/download-artifact@v4
  with:
    name: my-build
    path: ./downloaded-build
```

### Key Options

| Option | Purpose |
|--------|---------|
| `name` | Unique identifier for the artifact |
| `path` | File or directory to upload |
| `retention-days` | How long to keep (default: 90 days) |
| `if-no-files-found` | `error`, `warn`, or `ignore` |
| `compression-level` | 0-9 (higher = smaller, slower) |

## How DJ.ai Uses Artifacts

### Test Results

When Playwright tests run, results are uploaded as artifacts so developers can inspect failures without re-running:

```yaml
- uses: actions/upload-artifact@v4
  if: always()  # Upload even when tests fail
  with:
    name: test-results
    path: electron-app/test-results/
    retention-days: 14
```

The `if: always()` condition is critical — test artifacts are most useful when tests *fail*, and without it, the upload step would be skipped on failure.

### Electron Installers

The release workflow uploads platform-specific installers:

```yaml
# Matrix build produces per-platform artifacts
- uses: actions/upload-artifact@v4
  with:
    name: electron-${{ matrix.os }}
    path: |
      electron-app/dist/*.exe
      electron-app/dist/*.dmg
      electron-app/dist/*.AppImage
```

### Cross-Job Dependencies

Artifacts enable **job chaining** — one job builds, another job deploys the output:

```yaml
jobs:
  build:
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: build
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
      - run: az webapp deploy --src-path ./dist
```

## DJ.ai Connection

DJ.ai's CI workflow uploads test results and Electron packaging outputs as artifacts. This means any developer can download a Windows, macOS, or Linux installer from the Actions tab without setting up a local build environment. Test result artifacts include Playwright traces and screenshots for debugging visual regressions.

## Key Takeaways

- Always upload test results with `if: always()` — they're most valuable on failure
- Use retention days to manage storage costs (14 days for tests, 90 for releases)
- Artifacts enable cross-job data passing (build in one job, deploy in another)
- Name artifacts descriptively, especially in matrix builds (`electron-windows-latest`)

## Further Reading

- [GitHub: Storing Workflow Data as Artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [actions/upload-artifact](https://github.com/actions/upload-artifact)
- [actions/download-artifact](https://github.com/actions/download-artifact)
