import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * This portfolio app has no real backend: the MSW service worker serves the API
 * in every environment (including the deployed demo). It must be running before
 * Angular boots so the very first HTTP call (session restore) is intercepted.
 */
async function startMockApi(): Promise<void> {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true });
}

startMockApi()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err: unknown) => console.error(err));
