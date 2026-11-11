import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, type Params, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import type { MockInstance } from 'vitest';

import { queryCustomers } from '../../../mocks/data/customers';
import { parseCustomerQuery } from './customer-query';
import { CustomersPage } from './customers-page';

describe('CustomersPage', () => {
  let http: HttpTestingController;
  let queryParams$: BehaviorSubject<Params>;
  let navigate: MockInstance<Router['navigate']>;

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
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  /** Answers the pending request with the mock backend, like the real app does. */
  const respond = (req: TestRequest) => {
    const params = Object.fromEntries(
      req.request.params.keys().map((key) => [key, req.request.params.get(key)]),
    );
    req.flush(queryCustomers(parseCustomerQuery(params)));
  };

  const pending = () => http.expectOne((req) => req.url === '/api/customers');

  /** Renders and serves the first request (no whenStable before flushing — see dashboard spec). */
  async function render(params: Params = {}) {
    queryParams$.next(params);
    const fixture = TestBed.createComponent(CustomersPage);
    fixture.detectChanges();
    const req = pending();
    respond(req);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement, req };
  }

  const lastNavigation = () => navigate.mock.lastCall?.[1]?.queryParams as Params;

  it('requests the query from the URL and renders a page of rows', async () => {
    const { el, req } = await render({ risk: 'high', sort: 'balance', dir: 'desc', page: '2' });

    expect(req.request.params.get('risk')).toBe('high');
    expect(req.request.params.get('sort')).toBe('balance');
    expect(req.request.params.get('page')).toBe('2');
    expect(el.querySelectorAll('tbody tr').length).toBe(25);
    expect(el.querySelector('th[aria-sort="descending"]')?.textContent).toContain('Balance');
  });

  it('toggles sort direction on the active column and resets to page 1', async () => {
    const { el } = await render({ page: '4' });
    const nameHeader = el.querySelector<HTMLButtonElement>('th[aria-sort] button')!;

    nameHeader.click();
    expect(lastNavigation()).toMatchObject({ sort: null, dir: 'desc', page: null });
  });

  it('uses the natural direction when sorting by a new column', async () => {
    const { el } = await render();
    const buttons = el.querySelectorAll<HTMLButtonElement>('thead button');
    buttons[1].click(); // Balance
    // Balance starts descending; the URL default is ascending, so `dir` must be explicit.
    expect(lastNavigation()).toMatchObject({ sort: 'balance', dir: 'desc' });
  });

  it('applies a filter and returns to page 1', async () => {
    const { el } = await render({ page: '3' });
    const select = el.querySelector<HTMLSelectElement>('#filter-segment')!;
    select.value = 'public';
    select.dispatchEvent(new Event('change'));

    expect(lastNavigation()).toMatchObject({ segment: 'public', page: null });
  });

  // Real timers on purpose: the debounce timer is first scheduled during render, so fake
  // timers installed afterwards would never drive it.
  it('debounces the search box before touching the URL', async () => {
    const { el } = await render();
    const input = el.querySelector<HTMLInputElement>('#customer-search')!;

    for (const text of ['q', 'qu', 'qui']) {
      input.value = text;
      input.dispatchEvent(new Event('input'));
      TestBed.tick(); // flushes effects, which feed toObservable(searchText)
    }
    expect(navigate).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(lastNavigation()).toMatchObject({ q: 'qui' });
  });

  it('shows an empty state with a way out', async () => {
    const { el } = await render({ q: 'no such customer' });
    expect(el.textContent).toContain('No customers found');

    const clear = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Clear filters'),
    )!;
    clear.click();
    expect(lastNavigation()).toMatchObject({ q: null, segment: null, risk: null, status: null });
  });
});
