import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  timeout: 30000,
  fullyParallel: false,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 430, height: 932 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['iPhone 11'] },
    },
  ],
})
