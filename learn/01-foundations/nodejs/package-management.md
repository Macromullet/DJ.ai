# Package Management

> npm, package.json, lock files, and semantic versioning — managing DJ.ai's 20+ dependencies.

npm (Node Package Manager) is the default package manager for Node.js. DJ.ai uses npm to manage all frontend dependencies — from React and Vite to Electron and Playwright. Understanding `package.json`, lock files, and semantic versioning is essential for maintaining a reproducible build.

---

## Core Concepts

### package.json

The `package.json` file is the manifest for a Node.js project. It declares the project's metadata, dependencies, and scripts. DJ.ai's `electron-app/package.json` defines:

```json
{
  "name": "dj-ai",
  "version": "0.1.0",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "tsc && vite build",
    "electron:dev": "concurrently 'vite --port 5173' 'wait-on http://localhost:5173 && electron .'",
    "electron:build": "npm run build && electron-builder",
    "test": "playwright test",
    "test:unit": "vitest run"
  },
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.0",
    "three": "^0.182.0"
  },
  "devDependencies": {
    "vite": "^5.4.11",
    "typescript": "^5.9.3",
    "electron": "^40.2.1",
    "vitest": "^4.0.18",
    "@playwright/test": "^1.58.2"
  }
}
```

Key sections:
- **`main`** — Electron's entry point (`electron/main.cjs`)
- **`scripts`** — npm run commands (`npm run dev`, `npm run build`)
- **`dependencies`** — Runtime packages shipped with the app
- **`devDependencies`** — Build/test tools not shipped in production

### Semantic Versioning (semver)

npm uses semver: `MAJOR.MINOR.PATCH` (e.g., `19.2.4`):

| Change | When | Example |
|--------|------|---------|
| **MAJOR** | Breaking changes | React 18 → 19 (new APIs, removed features) |
| **MINOR** | New features, backward-compatible | 19.1 → 19.2 (new hooks) |
| **PATCH** | Bug fixes | 19.2.3 → 19.2.4 (security fix) |

Version ranges in package.json:
- `^19.2.4` — Compatible with 19.x.x (allows minor + patch updates)
- `~19.2.4` — Approximately 19.2.x (allows patch updates only)
- `19.2.4` — Exact version (no updates)

DJ.ai uses `^` (caret) ranges — allowing compatible updates while the lock file pins exact versions.

### package-lock.json

The lock file pins **exact** versions of every dependency (and their dependencies). This ensures every developer and CI build gets identical `node_modules`:

```
package.json says: "react": "^19.2.4"
package-lock.json pins: "react": "19.2.4" (exact)
```

**Critical rule:** Always commit `package-lock.json` to Git. Never modify it manually. DJ.ai's contributing guidelines say: don't modify `package.json` or `package-lock.json` without explicit permission.

### npm Commands

| Command | Purpose |
|---------|---------|
| `npm install` | Install all dependencies from lock file |
| `npm run dev` | Run the `dev` script (Vite dev server) |
| `npm run build` | Run the `build` script (TypeScript + Vite) |
| `npm test` | Run the `test` script (Playwright) |
| `npm run test:unit` | Run unit tests with Vitest |
| `npm ls` | List installed packages |
| `npm outdated` | Check for newer versions |
| `npm audit` | Check for security vulnerabilities |

### node_modules

`npm install` downloads all dependencies into `node_modules/`. This directory is **not committed** to Git (listed in `.gitignore`). It can contain thousands of folders — React alone brings 5+ transitive dependencies.

---

## 🔗 DJ.ai Connection

- **`electron-app/package.json`** — Declares React 19, Vite 5, Electron 40, Three.js, Playwright, Vitest, and all other dependencies; defines all `npm run` scripts
- **`electron-app/package-lock.json`** — Pins exact versions for reproducible builds across dev machines and CI
- **`.github/workflows/ci.yml`** — CI runs `npm ci` (clean install from lock file) to ensure reproducibility
- **`DJai.AppHost/Program.cs`** — Aspire uses `AddNpmApp()` to start the Vite dev server, relying on npm scripts
- **`electron-app/.gitignore`** — Excludes `node_modules/`, `dist/`, and `release/`

---

## 🎯 Key Takeaways

- **`package.json`** declares dependencies and scripts; **`package-lock.json`** pins exact versions
- **Semantic versioning** (`^MAJOR.MINOR.PATCH`) controls how dependencies update
- Always use **`npm ci`** in CI/CD — it installs from the lock file for reproducibility
- **Never manually edit** `package-lock.json` — let npm manage it
- DJ.ai separates **runtime deps** (`react`, `three`) from **dev deps** (`vite`, `typescript`, `electron`)
- The `main` field in package.json points to Electron's entry: `electron/main.cjs`

---

## 📖 Resources

- [package.json reference](https://docs.npmjs.com/cli/v10/configuring-npm/package-json) — Official npm documentation
- [Semantic Versioning](https://semver.org/) — The semver specification
- [npm CLI Commands](https://docs.npmjs.com/cli/v10/commands) — Full npm command reference
- [package-lock.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json) — Lock file documentation
- [npm ci vs npm install](https://docs.npmjs.com/cli/v10/commands/npm-ci) — When to use each
