import { delay, http, HttpResponse } from 'msw';

import { isDashboardRange } from '../../app/features/dashboard/dashboard.models';
import { authenticate, unauthorized } from '../authenticate';
import { buildDashboardSummary } from '../data/dashboard';

export const dashboardHandlers = [
  http.get('/api/dashboard', async ({ request }) => {
    await delay(500);
    if (!authenticate(request)) return unauthorized();

    const range = new URL(request.url).searchParams.get('range') ?? '12m';
    if (!isDashboardRange(range)) {
      return HttpResponse.json({ message: `Unsupported range "${range}"` }, { status: 400 });
    }
    return HttpResponse.json(buildDashboardSummary(range));
  }),
];
