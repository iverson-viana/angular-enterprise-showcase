import { delay, http, HttpResponse } from 'msw';

import type {
  CustomerInput,
  FieldErrorsResponse,
  NameAvailability,
} from '../../app/features/customers/customer-form/customer-form.models';
import { parseCustomerQuery } from '../../app/features/customers/customer-query';
import { authenticate, unauthorized } from '../authenticate';
import {
  createCustomer,
  customerDetails,
  isCustomerNameTaken,
  queryCustomers,
  updateCustomer,
} from '../data/customers';

const forbidden = () => HttpResponse.json({ message: 'Insufficient role' }, { status: 403 });
const notFound = () => HttpResponse.json({ message: 'Customer not found' }, { status: 404 });
const nameConflict = () =>
  HttpResponse.json<FieldErrorsResponse>(
    {
      message: 'A customer with this legal name already exists.',
      fieldErrors: { legalName: 'A customer with this legal name already exists.' },
    },
    { status: 409 },
  );

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

  // Must come before `/api/customers/:id`, which would otherwise match it.
  http.get('/api/customers/name-availability', async ({ request }) => {
    await delay(300);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const params = new URL(request.url).searchParams;
    const taken = isCustomerNameTaken(
      params.get('name') ?? '',
      params.get('excludeId') ?? undefined,
    );
    return HttpResponse.json<NameAvailability>({ available: !taken });
  }),

  http.get('/api/customers/:id', async ({ request, params }) => {
    await delay(300);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role === 'viewer') return forbidden();

    const details = customerDetails(String(params['id']));
    return details ? HttpResponse.json(details) : notFound();
  }),

  http.post('/api/customers', async ({ request }) => {
    await delay(600);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const body = (await request.json()) as CustomerInput;
    // The client checks this too, but only the server can be trusted (and races happen).
    if (isCustomerNameTaken(body.legalName)) return nameConflict();
    return HttpResponse.json(createCustomer(body), { status: 201 });
  }),

  http.put('/api/customers/:id', async ({ request, params }) => {
    await delay(600);
    const user = authenticate(request);
    if (!user) return unauthorized();
    if (user.role !== 'admin') return forbidden();

    const id = String(params['id']);
    const body = (await request.json()) as CustomerInput;
    const current = customerDetails(id);
    if (!current) return notFound();
    // Only a *changed* name can conflict: generated data has look-alikes that predate the edit.
    if (body.legalName !== current.legalName && isCustomerNameTaken(body.legalName, id)) {
      return nameConflict();
    }
    return HttpResponse.json(updateCustomer(id, body));
  }),
];
