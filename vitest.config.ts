import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/**/*.test.ts'],
    exclude: ['**/comprehensive.spec.ts', '**/e2e.test.ts', '**/*.spec.ts', '**/*.e2e.test.ts'],
    testTimeout: 30000
  }
})