import { defineConfig } from '@playwright/test';

import base from './playwright.config';

/**
 * Regenerates the README media (screenshots + demo GIF) from the running app:
 * `npm run docs:media`. Kept apart from the e2e suite so CI never rewrites docs.
 */
export default defineConfig({
  ...base,
  testMatch: '**/*.capture.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...base.use,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
  },
});
