import { TestBed } from '@angular/core/testing';

import { CashflowChart } from './cashflow-chart';
import type { CashflowPoint } from './dashboard.models';

const POINTS: CashflowPoint[] = [
  { month: '2026-01', inflow: 4_000_000, outflow: 3_000_000 },
  { month: '2026-02', inflow: 4_500_000, outflow: 3_200_000 },
  { month: '2026-03', inflow: 5_000_000, outflow: 3_900_000 },
];

describe('CashflowChart', () => {
  async function setup() {
    const fixture = TestBed.createComponent(CashflowChart);
    fixture.componentRef.setInput('points', POINTS);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const plot = el.querySelector<HTMLElement>('[role="group"]')!;
    const live = () => el.querySelector('[aria-live]')?.textContent?.trim();
    const press = async (key: string) => {
      plot.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, el, plot, live, press };
  }

  it('draws one line per series and a legend', async () => {
    const { el } = await setup();
    expect(el.querySelectorAll('path')).toHaveLength(2);
    expect(el.querySelector('[aria-label="Legend"]')?.textContent).toContain('Inflow');
    expect(el.querySelector('[aria-label="Legend"]')?.textContent).toContain('Outflow');
  });

  it('starts at the latest month on focus and moves with the arrow keys', async () => {
    const { fixture, plot, live, press } = await setup();

    plot.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(live()).toBe('March 2026: Inflow $5,000,000, Outflow $3,900,000');

    await press('ArrowLeft');
    expect(live()).toContain('February 2026');

    await press('Home');
    expect(live()).toContain('January 2026');

    await press('ArrowLeft');
    expect(live()).toContain('January 2026');
  });

  it('clears the readout on blur', async () => {
    const { fixture, plot, live } = await setup();
    plot.dispatchEvent(new FocusEvent('focus'));
    plot.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('offers every value in a table view', async () => {
    const { el } = await setup();
    const rows = el.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('January 2026');
    expect(rows[0].textContent).toContain('$1,000,000');
  });
});
