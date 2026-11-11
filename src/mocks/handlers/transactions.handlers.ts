import { delay, http, HttpResponse } from 'msw';

import {
  parseTransactionFilters,
  TRANSACTIONS_PAGE_LIMIT,
} from '../../app/features/transactions/transaction-query';
import { authenticate, unauthorized } from '../authenticate';
import { queryTransactions } from '../data/transactions';

export const transactionsHandlers = [
  http.get('/api/transactions', async ({ request }) => {
    await delay(400);
    if (!authenticate(request)) return unauthorized();

    const params = new URL(request.url).searchParams;
    const filters = parseTransactionFilters(Object.fromEntries(params));
    const limit = Number(params.get('limit')) || TRANSACTIONS_PAGE_LIMIT;
    return HttpResponse.json(queryTransactions(filters, params.get('cursor'), limit));
  }),
];
