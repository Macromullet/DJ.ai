# Electron App Packaging & Distribution

## Overview

Building an Electron app for development is easy — just run `electron .`. But distributing it to users requires packaging the app into platform-specific installers that handle installation, updates, code signing, and OS integration.

Electron apps must be bundled with:
- Your application code (HTML, CSS, JS, assets)
- The Electron runtime (Chromium + Node.js)
- Native modules (if any)
- Platform-specific metadata (icons, file associations, permissions)

## Topics in This Section

| Topic | Description |
|-------|-------------|
| [electron-builder](./electron-builder.md) | Build configuration, targets, auto-update |
| [Code Signing](./code-signing.md) | Platform signing and notarization |

## Build Targets by Platform

| Platform | Format | Description |
|----------|--------|-------------|
| Windows | NSIS | Installer wizard (.exe) |
| macOS | DMG | Disk image (drag-to-Applications) |
| Linux | AppImage | Portable single-file app |

## The Build Pipeline

```
Source Code → TypeScript Compile → Vite Bundle → electron-builder → Installer
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                  ▼                 ▼
                                Windows (.exe)   macOS (.dmg)    Linux (.AppImage)
```

## Key Takeaways

- Packaging bundles your code **with** the entire Electron runtime (~150MB+)
- Each platform has its own installer format and signing requirements
- CI/CD should build for all platforms — cross-compilation has limitations
- Code signing is optional for development but **required** for production distribution

## DJ.ai Connection

DJ.ai uses electron-builder configured in `electron-app/package.json`. The CI pipeline (`.github/workflows/release-electron.yml`) builds distributables for Windows (NSIS), macOS (DMG), and Linux (AppImage) when version tags are pushed. The `electron:build` script runs `npm run build && electron-builder`, first compiling TypeScript and bundling with Vite, then packaging the result. Development builds use `electron:dev` which runs Vite and Electron concurrently without packaging.
