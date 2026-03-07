import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/*.integration.{test,spec}.{ts,tsx}',
    ],
    reporters: ['default', 'json'],
    outputFile: {
      json: 'test-results/vitest-integration-results.json',
    },
  },
})
