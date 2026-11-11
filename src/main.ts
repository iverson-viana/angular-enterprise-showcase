import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/app';
import { appConfig } from './app/app.config';

/**
 * This portfolio app has no real backend: an in-page mock API (MSW handlers) answers
 * `/api/*` in every environment, including the deployed demo. It must be installed
 * before Angular boots so the very first HTTP call (session restore) is intercepted.
 */
async function startMockApi(): Promise<void> {
  const { startMockApi } = await import('./mocks/mock-api');
  startMockApi({ log: isDevMode() });
}

startMockApi()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err: unknown) => console.error(err));
