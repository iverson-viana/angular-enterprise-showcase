import { TestBed } from '@angular/core/testing';

import type { Kpi } from './dashboard.models';
import { StatTile } from './stat-tile';

const kpi = (overrides: Partial<Kpi>): Kpi => ({
  id: 'inflow',
  label: 'Total inflow',
  value: 110,
  previous: 100,
  format: 'currency',
  higherIsBetter: true,
  ...overrides,
});

async function render(value: Kpi): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(StatTile);
  fixture.componentRef.setInput('kpi', value);
  fixture.componentRef.setInput('periodLabel', '12 months');
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('StatTile', () => {
  it('renders label, compact value and delta', async () => {
    const el = await render(kpi({ value: 4_213_567, previous: 4_000_000 }));
    expect(el.querySelector('h2')?.textContent).toContain('Total inflow');
    expect(el.textContent).toContain('$4.2M');
    expect(el.textContent).toContain('+5.3%');
    expect(el.textContent).toContain('vs previous 12 months');
  });

  it('marks an increase as favorable when higher is better', async () => {
    const el = await render(kpi({ higherIsBetter: true }));
    expect(el.textContent).toContain('(favorable)');
    expect(el.querySelector('.text-green-700')).not.toBeNull();
  });

  it('marks an increase as unfavorable when lower is better', async () => {
    const el = await render(kpi({ id: 'outflow', higherIsBetter: false }));
    expect(el.textContent).toContain('(unfavorable)');
    expect(el.querySelector('.text-red-700')).not.toBeNull();
  });

  it('shows a dash when there is no previous value', async () => {
    const el = await render(kpi({ previous: 0 }));
    expect(el.textContent).toContain('—');
  });
});
