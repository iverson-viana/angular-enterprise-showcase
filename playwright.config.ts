import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const baseURL = `http://localhost:${PORT}`;
const isCI = !!process.env['CI'];

/**
 * End-to-end tests run against the production build. The mock API lives inside the page
 * (src/mocks), so this exercises exactly what gets deployed — no backend to start.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // No watch / live reload: Playwright writes test-results/ inside the project, which would
    // otherwise reload every open page mid-test.
    command: `npx ng serve --configuration production --port ${PORT} --watch=false --live-reload=false`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
