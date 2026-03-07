import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'electron/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'tests/**/*', // Playwright E2E tests
      'node_modules/**',
    ],
    reporters: ['default', 'json', 'junit'],
    outputFile: {
      json: 'test-results/vitest-results.json',
      junit: 'test-results/vitest-junit.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: 'test-results/coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/vite-env.d.ts',
        'src/**/__tests__/**',
        'src/**/test-fixtures/**',
      ],
    },
  },
})
