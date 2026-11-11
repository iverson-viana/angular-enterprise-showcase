import { buildDashboardSummary } from './dashboard';

describe('buildDashboardSummary (mock data)', () => {
  it.each([
    ['3m', 3],
    ['6m', 6],
    ['12m', 12],
  ] as const)('returns %s of monthly points', (range, months) => {
    const summary = buildDashboardSummary(range);
    expect(summary.cashflow).toHaveLength(months);
    expect(summary.kpis.map((k) => k.id)).toEqual(['inflow', 'outflow', 'net', 'flagged']);
  });

  it('is deterministic', () => {
    expect(buildDashboardSummary('6m')).toEqual(buildDashboardSummary('6m'));
  });

  it('keeps KPIs consistent with the series', () => {
    const { kpis, cashflow } = buildDashboardSummary('3m');
    const inflow = cashflow.reduce((sum, p) => sum + p.inflow, 0);
    const outflow = cashflow.reduce((sum, p) => sum + p.outflow, 0);
    expect(kpis.find((k) => k.id === 'inflow')?.value).toBe(inflow);
    expect(kpis.find((k) => k.id === 'net')?.value).toBe(inflow - outflow);
  });
});
