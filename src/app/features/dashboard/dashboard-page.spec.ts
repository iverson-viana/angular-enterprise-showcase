import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { buildDashboardSummary } from '../../../mocks/data/dashboard';
import { DashboardPage } from './dashboard-page';

describe('DashboardPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      // `@defer (on viewport)` needs IntersectionObserver, absent in jsdom — drive it manually.
      deferBlockBehavior: DeferBlockBehavior.Manual,
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * Renders without awaiting stability: a pending httpResource request is a pending task,
   * so `whenStable()` would only resolve after the test flushes the response.
   */
  async function render(range?: string) {
    const fixture = TestBed.createComponent(DashboardPage);
    if (range) fixture.componentRef.setInput('range', range);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('loads the default 12-month range and renders the KPIs', async () => {
    const { fixture, el } = await render();
    expect(el.textContent).toContain('Loading dashboard');

    http.expectOne('/api/dashboard?range=12m').flush(buildDashboardSummary('12m'));
    await fixture.whenStable();

    expect(el.querySelectorAll('app-stat-tile')).toHaveLength(4);
    expect(el.textContent).toContain('vs previous 12 months');
  });

  it('requests the range from the URL', async () => {
    const { fixture } = await render('3m');
    http.expectOne('/api/dashboard?range=3m').flush(buildDashboardSummary('3m'));
    await fixture.whenStable();
  });

  it('falls back to the default for an unknown range', async () => {
    const { fixture } = await render('99y');
    http.expectOne('/api/dashboard?range=12m').flush(buildDashboardSummary('12m'));
    await fixture.whenStable();
  });

  it('shows an error with a retry action', async () => {
    const { fixture, el } = await render();
    http
      .expectOne('/api/dashboard?range=12m')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain("couldn't load");

    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();
    http.expectOne('/api/dashboard?range=12m').flush(buildDashboardSummary('12m'));
    await fixture.whenStable();

    expect(el.querySelectorAll('app-stat-tile')).toHaveLength(4);
  });
});
