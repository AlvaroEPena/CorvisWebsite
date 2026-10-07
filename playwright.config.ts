import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production build (`astro preview`), never the dev server.
export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts'],
  fullyParallel: true,
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:4329', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4329',
    url: 'http://localhost:4329',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'reduced-motion', use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' } },
  ],
});
