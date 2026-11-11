import { delay, http, HttpResponse } from 'msw';

import { parseCustomerQuery } from '../../app/features/customers/customer-query';
import type {
  CreateCustomerRequest,
  FieldErrorsResponse,
  NameAvailability,
} from '../../app/features/customers/new-customer/new-customer.models';
import { authenticate, unauthorized } from '../authenticate';
import { createCustomer, isCustomerNameTaken, queryCustomers } from '../data/customers';

const forbidden = () => HttpResponse.json({ message: 'Insufficient role' }, { status: 403 });

export const customersHandlers = [
  http.get('/api/customers', async ({ request }) => {
    await delay(350);
    const user = authenticate(request);
    if (!user) return unauthorized();
    // Same rule as the route guard — enforced server-side too.
    if (user.role === 'viewer') return forbidden();

    const params = Object.fromEntries(new URL(request.url).searchParams);
    return HttpResponse.json(queryCustomers(parseCustomerQuery(params)));
  }),

  http.get('/api/customers/name-availability', async ({ request }) => {
    await delay(300);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const name = new URL(request.url).searchParams.get('name') ?? '';
    return HttpResponse.json<NameAvailability>({ available: !isCustomerNameTaken(name) });
  }),

  http.post('/api/customers', async ({ request }) => {
    await delay(600);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const body = (await request.json()) as CreateCustomerRequest;
    // The client checks this too, but only the server can be trusted (and races happen).
    if (isCustomerNameTaken(body.legalName)) {
      return HttpResponse.json<FieldErrorsResponse>(
        {
          message: 'A customer with this legal name already exists.',
          fieldErrors: { legalName: 'A customer with this legal name already exists.' },
        },
        { status: 409 },
      );
    }
    return HttpResponse.json(createCustomer(body), { status: 201 });
  }),
];
