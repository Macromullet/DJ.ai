# electron-builder

## What Is electron-builder?

electron-builder is the most popular tool for packaging and distributing Electron applications. It takes your compiled app code and Electron runtime and produces platform-specific installers — NSIS for Windows, DMG for macOS, AppImage for Linux.

## Configuration

electron-builder is configured in `package.json` under the `"build"` key:

```json
{
  "build": {
    "appId": "com.djai.app",
    "productName": "DJ.ai",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": ["nsis"]
    },
    "mac": {
      "target": ["dmg"]
    },
    "linux": {
      "target": ["AppImage"]
    },
    "publish": null
  }
}
```

### Key Configuration Options

| Option | Purpose | DJ.ai Value |
|--------|---------|-------------|
| `appId` | Unique app identifier (reverse domain) | `com.djai.app` |
| `productName` | Display name in OS | `DJ.ai` |
| `files` | Glob patterns for included files | `dist/**/*`, `electron/**/*` |
| `directories.output` | Where built installers go | `release/` |
| `publish` | Auto-update server config | `null` (disabled) |

### Platform Targets

- **NSIS** (Windows): Full installer with wizard, uninstaller, start menu entry
- **DMG** (macOS): Disk image with drag-to-Applications UI
- **AppImage** (Linux): Self-contained portable executable

## Build Commands

```bash
# Full build: TypeScript → Vite → electron-builder
npm run electron:build

# Which expands to:
npm run build && electron-builder

# Which expands to:
tsc && vite build && electron-builder
```

## CI/CD Integration

The release workflow builds for all platforms using GitHub Actions:

```yaml
# Simplified from .github/workflows/release-electron.yml
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - run: npm ci
      - run: npm run electron:build
```

Each platform runner produces its native installer format.

## Key Links

- [electron-builder Documentation](https://www.electron.build/)
- [Configuration Reference](https://www.electron.build/configuration)
- [Multi-Platform Build](https://www.electron.build/multi-platform-build)
- [Auto-Update](https://www.electron.build/auto-update)

## Key Takeaways

- Configure electron-builder in `package.json` under `"build"`
- `files` determines what gets packaged — keep it minimal
- Build on each platform natively for best results (CI matrix strategy)
- `publish: null` disables auto-update — enable when ready for production

## DJ.ai Connection

DJ.ai's electron-builder config in `electron-app/package.json` packages the Vite-built `dist/` directory and the `electron/` directory (main process scripts) into platform-specific installers. The CI pipeline in `.github/workflows/release-electron.yml` uses a matrix strategy to build on Windows, macOS, and Linux simultaneously. Output goes to the `release/` directory. Auto-update is currently disabled (`publish: null`) since DJ.ai is in active development — it will be enabled once the app reaches a stable release.
