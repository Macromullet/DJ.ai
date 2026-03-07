# ADR: Why Electron

## Status

Accepted

## Context

DJ.ai needs to run as a **desktop application** on Windows, macOS, and Linux with access to:
- System tray integration (persistent icon, quick controls)
- Global media key handling (play/pause/next from keyboard)
- Desktop notifications (track changes, commentary)
- Local file system (future: local music library)
- Native window management (always-on-top option)

A purely web-based solution (PWA) can't access these system-level features reliably.

## Decision

Use **Electron** as the application shell, with React + TypeScript + Vite for the renderer.

## Alternatives Considered

### Tauri (Rust-based)

| Pros | Cons |
|------|------|
| Smaller binary (~10MB vs ~150MB) | Younger ecosystem, fewer examples |
| Lower memory usage | WebView varies by platform (WKWebView, WebView2) |
| Rust security benefits | Harder to debug (two languages) |
| No bundled Chromium | Some web APIs unavailable on all platforms |

**Why not:** DJ.ai relies heavily on Web Audio API and consistent Chromium behavior for audio visualization and TTS playback. WebView inconsistencies across platforms would create significant testing burden.

### Progressive Web App (PWA)

| Pros | Cons |
|------|------|
| No install required | No system tray or media key access |
| Automatic updates | Limited offline capabilities |
| Smaller footprint | No native notifications (reliably) |

**Why not:** PWAs can't access system tray, global keyboard shortcuts, or native media key integration — all essential for a music player.

### Native Apps (Swift/Kotlin/C++)

| Pros | Cons |
|------|------|
| Best performance | Three separate codebases |
| Native look and feel | 3× development cost |
| Smallest memory footprint | Different languages/frameworks per platform |

**Why not:** Maintaining three codebases for a side project is impractical. Electron's "write once, run everywhere" tradeoff is worth the memory overhead.

## Consequences

**Positive:**
- Single codebase for all platforms
- Huge ecosystem of web libraries (React, Web Audio, etc.)
- Fast development iteration with hot reload
- Consistent behavior across platforms (same Chromium engine)

**Negative:**
- ~150MB app size (bundled Chromium)
- Higher memory usage (~200MB baseline)
- Not native look and feel (mitigated by custom design system)

## DJ.ai Connection

Electron is configured in `electron-app/electron.cjs` (main process) and `electron-app/preload.cjs` (IPC bridge). The `package.json` defines build targets for all three platforms. The CI workflow tests packaging on Windows, macOS, and Linux via matrix builds.

## Further Reading

- [Electron: Why Electron?](https://www.electronjs.org/docs/latest/tutorial/why-electron)
- [Tauri vs Electron Comparison](https://tauri.app/start/)
- [Electron Builder Documentation](https://www.electron.build/)
