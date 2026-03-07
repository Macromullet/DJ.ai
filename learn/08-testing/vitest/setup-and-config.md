# Vitest Setup and Configuration

## Concept

Vitest configuration defines the test environment, reporters, coverage settings, and global mocks. DJ.ai's configuration is split between two files: `vitest.config.ts` (framework settings) and `vitest.setup.ts` (global test doubles).

## vitest.config.ts

Located at `electron-app/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',           // Browser APIs in Node.js
    globals: true,                   // describe/it/expect without imports
    setupFiles: './vitest.setup.ts', // Global mock configuration

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'electron/__tests__/**/*.{test,spec}.{ts,tsx}'
    ],

    // Machine-readable reporters for agent consumption
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: 'test-results/vitest-results.json',
      junit: 'test-results/vitest-junit.xml'
    },

    // V8 coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: 'test-results/coverage',
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70
      }
    }
  }
});
```

### Key Settings Explained

| Setting | Value | Why |
|---------|-------|-----|
| `environment: 'jsdom'` | Simulates browser DOM | Components use `document`, `window`, `localStorage` |
| `globals: true` | Auto-imports test functions | Less boilerplate in every test file |
| `setupFiles` | `vitest.setup.ts` | Mocks configured once, available everywhere |
| `reporters` | `default, json, junit` | Human output + machine-readable for agents |
| `coverage.provider` | `v8` | Fast, native coverage via V8's built-in instrumentation |

## vitest.setup.ts

Located at `electron-app/vitest.setup.ts` (~182 lines), this file configures global mocks for the Electron/browser environment:

### window.electron Mock

```typescript
// Simulates the Electron preload API
Object.defineProperty(window, 'electron', {
  value: {
    aiProxy: { request: vi.fn() },
    tts: { speak: vi.fn() },
    oauth: { openExternal: vi.fn() },
    oauthDeepLink: { onCallback: vi.fn() },
    tray: { /* mock methods */ },
    notifications: { show: vi.fn() },
    platform: 'darwin'
  }
});
```

### Audio API Mocks

```typescript
// Mock Audio constructor for playback tests
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  src: '',
  currentTime: 0,
  duration: 0,
  volume: 1
}));

// Mock AudioContext for visualization/analysis
global.AudioContext = vi.fn().mockImplementation(() => ({
  createBufferSource: vi.fn(),
  createGain: vi.fn(),
  createAnalyser: vi.fn(),
  decodeAudioData: vi.fn()
}));
```

### Web API Mocks

```typescript
global.fetch = vi.fn();
URL.createObjectURL = vi.fn();
URL.revokeObjectURL = vi.fn();
window.matchMedia = vi.fn().mockReturnValue({ matches: false });
window.SpeechSynthesisUtterance = vi.fn();
```

### Cleanup

```typescript
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
```

## Running Tests

```bash
cd electron-app

npm test                    # All tests with default reporter
npm test -- --watch         # Watch mode (re-runs on file change)
npm test -- --reporter=verbose  # Detailed output
npm run test:coverage       # With V8 coverage
```

## Key Takeaways

- `jsdom` environment enables testing browser APIs without a real browser
- Global mocks in `vitest.setup.ts` simulate the Electron runtime
- Multiple reporters (JSON, JUnit) enable both human and agent consumption
- `afterEach` cleanup prevents state leakage between tests

## DJ.ai Connection

The Vitest configuration is carefully tuned for DJ.ai's dual audience: developers see readable terminal output via the `default` reporter, while AI agents consume structured `vitest-results.json` and `vitest-junit.xml` files. The global mock setup in `vitest.setup.ts` creates a faithful simulation of the Electron environment, so component tests exercise real rendering logic against mock boundaries.

## Further Reading

- [Vitest Configuration Reference](https://vitest.dev/config/)
- [Vitest Getting Started](https://vitest.dev/guide/)
- [jsdom Environment](https://vitest.dev/guide/environment#jsdom)
