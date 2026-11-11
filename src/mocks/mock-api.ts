import { FetchInterceptor } from '@mswjs/interceptors/fetch';
import { getResponse } from 'msw';

import { authHandlers } from './handlers/auth.handlers';
import { customersHandlers } from './handlers/customers.handlers';
import { dashboardHandlers } from './handlers/dashboard.handlers';

export const handlers = [...authHandlers, ...dashboardHandlers, ...customersHandlers];

const API_PREFIX = '/api/';

/**
 * In-page mock backend: patches `fetch` so the MSW handlers answer `/api/*` requests.
 *
 * Why not MSW's Service Worker (`setupWorker`)? The browser terminates idle workers, and
 * MSW keeps its "mocking enabled" client list in worker memory — after a restart, requests
 * silently pass through to the dev server. With no real backend behind this demo, in-page
 * interception has no lifecycle to break. Trade-off: mocked calls don't show in the
 * Network tab, so they are logged to the console instead (dev mode).
 *
 * Requires HttpClient to use fetch (`provideHttpClient(withFetch())`).
 *
 * @returns a function that restores the original `fetch`.
 */
export function startMockApi({ log = false } = {}): () => void {
  const interceptor = new FetchInterceptor();

  interceptor.on('request', async ({ request, controller }) => {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(API_PREFIX)) return;

    const response =
      (await getResponse(handlers, request)) ??
      Response.json(
        { message: `No mock handler for ${request.method} ${url.pathname}` },
        { status: 404 },
      );

    if (log) {
      console.debug(
        `[mock api] ${request.method} ${url.pathname}${url.search} → ${response.status}`,
      );
    }
    controller.respondWith(response);
  });

  interceptor.apply();
  return () => interceptor.dispose();
}
