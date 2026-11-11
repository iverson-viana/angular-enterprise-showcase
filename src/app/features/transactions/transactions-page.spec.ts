import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, type Params, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { queryTransactions } from '../../../mocks/data/transactions';
import { TransactionsPage } from './transactions-page';

describe('TransactionsPage', () => {
  let http: HttpTestingController;
  let queryParams$: BehaviorSubject<Params>;

  beforeAll(() => {
    // jsdom doesn't implement scrolling; the viewport calls scrollTo when the feed restarts.
    Element.prototype.scrollTo ??= () => undefined;
  });

  beforeEach(() => {
    queryParams$ = new BehaviorSubject<Params>({});
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$ } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(params: Params = {}) {
    queryParams$.next(params);
    const fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url === '/api/transactions');
    req.flush(queryTransactions({ q: '', type: null, status: null, ...params }, null, 100));
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, req };
  }

  it('starts the feed from the URL filters', async () => {
    const { req } = await render({ status: 'flagged' });
    expect(req.request.params.get('status')).toBe('flagged');
    expect(req.request.params.has('cursor')).toBe(false);
  });

  it('announces how much of the feed is loaded', async () => {
    const { el } = await render();
    expect(el.querySelector('[aria-live="polite"]')?.textContent).toContain(
      'Showing 100 of 10,000 transactions',
    );
    expect(el.querySelector('[role="table"]')?.getAttribute('aria-rowcount')).toBe('10001');
  });

  it('replaces the URL filters when one changes', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const { el } = await render({ q: 'inv' });

    const select = el.querySelector<HTMLSelectElement>('#tx-filter-type')!;
    select.value = 'credit';
    select.dispatchEvent(new Event('change'));

    expect(navigate.mock.lastCall?.[1]?.queryParams).toEqual({ q: 'inv', type: 'credit' });
  });

  it('restarts the feed when the URL filters change', async () => {
    await render();
    queryParams$.next({ type: 'debit' });
    const req = http.expectOne((r) => r.url === '/api/transactions');
    expect(req.request.params.get('type')).toBe('debit');
    req.flush(queryTransactions({ q: '', type: 'debit', status: null }, null, 100));
  });
});
