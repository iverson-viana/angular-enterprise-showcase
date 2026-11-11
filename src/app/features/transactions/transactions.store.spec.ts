import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { queryTransactions } from '../../../mocks/data/transactions';
import {
  DEFAULT_TRANSACTION_FILTERS,
  parseTransactionFilters,
  type TransactionFilters,
} from './transaction-query';
import { TransactionsStore } from './transactions.store';

describe('TransactionsStore', () => {
  let store: TransactionsStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), TransactionsStore],
    });
    store = TestBed.inject(TransactionsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const next = () => http.expectOne((req) => req.url === '/api/transactions');
  const param = (req: TestRequest, key: string) => req.request.params.get(key);

  /** Serves a request from the mock backend, like the real app. */
  const serve = (req: TestRequest) => {
    const p = req.request.params;
    const filters = parseTransactionFilters({
      q: p.get('q'),
      type: p.get('type'),
      status: p.get('status'),
    });
    req.flush(queryTransactions(filters, p.get('cursor'), Number(p.get('limit'))));
  };

  const load = (filters: TransactionFilters = DEFAULT_TRANSACTION_FILTERS) => {
    store.load(filters);
    const req = next();
    serve(req);
    return req;
  };

  it('loads the first page without a cursor', () => {
    const req = load();
    expect(param(req, 'cursor')).toBeNull();
    expect(param(req, 'limit')).toBe('100');
    expect(store.items()).toHaveLength(100);
    expect(store.total()).toBe(10_000);
    expect(store.hasMore()).toBe(true);
  });

  it('appends the next page using the returned cursor', () => {
    load();
    store.loadMore();
    const req = next();
    expect(param(req, 'cursor')).toBe('100');
    serve(req);
    expect(store.items()).toHaveLength(200);
    expect(store.items()[100].id).not.toBe(store.items()[99].id);
  });

  it('ignores loadMore while a request is in flight', () => {
    store.load(DEFAULT_TRANSACTION_FILTERS);
    store.loadMore();
    store.loadMore();
    serve(next()); // expectOne would throw if a second request had been sent
  });

  it('stops when the feed is exhausted', () => {
    load({ q: 'TX-000001', type: null, status: null });
    expect(store.hasMore()).toBe(false);
    store.loadMore();
    http.expectNone((req) => req.url === '/api/transactions');
  });

  it('cancels the in-flight request when the filters change', () => {
    store.load(DEFAULT_TRANSACTION_FILTERS);
    const stale = next();
    store.load({ ...DEFAULT_TRANSACTION_FILTERS, type: 'debit' });

    expect(stale.cancelled).toBe(true);
    const fresh = next();
    expect(param(fresh, 'type')).toBe('debit');
    serve(fresh);
    expect(store.items().every((t) => t.type === 'debit')).toBe(true);
  });

  it('keeps loaded rows on error and retries via loadMore', () => {
    load();
    store.loadMore();
    next().flush(null, { status: 500, statusText: 'Server Error' });

    expect(store.hasError()).toBe(true);
    expect(store.items()).toHaveLength(100);

    store.loadMore();
    const retry = next();
    expect(param(retry, 'cursor')).toBe('100');
    serve(retry);
    expect(store.hasError()).toBe(false);
    expect(store.items()).toHaveLength(200);
  });
});
