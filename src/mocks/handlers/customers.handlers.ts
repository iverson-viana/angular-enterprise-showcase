import { delay, http, HttpResponse } from 'msw';

import { parseCustomerQuery } from '../../app/features/customers/customer-query';
import { authenticate, unauthorized } from '../authenticate';
import { queryCustomers } from '../data/customers';

export const customersHandlers = [
  http.get('/api/customers', async ({ request }) => {
    await delay(350);
    const user = authenticate(request);
    if (!user) return unauthorized();
    // Same rule as the route guard — enforced server-side too.
    if (user.role === 'viewer') {
      return HttpResponse.json({ message: 'Insufficient role' }, { status: 403 });
    }

    const params = Object.fromEntries(new URL(request.url).searchParams);
    return HttpResponse.json(queryCustomers(parseCustomerQuery(params)));
  }),
];
