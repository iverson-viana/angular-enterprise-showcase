export const DASHBOARD_RANGES = ['3m', '6m', '12m'] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export const isDashboardRange = (value: unknown): value is DashboardRange =>
  DASHBOARD_RANGES.includes(value as DashboardRange);

export type KpiId = 'inflow' | 'outflow' | 'net' | 'flagged';

export interface Kpi {
  id: KpiId;
  label: string;
  /** Value for the selected period. */
  value: number;
  /** Value for the equally long period right before it. */
  previous: number;
  format: 'currency' | 'count';
  /** Whether an increase is good news (drives the delta's tone). */
  higherIsBetter: boolean;
}

export interface CashflowPoint {
  /** ISO month, e.g. `2026-10`. */
  month: string;
  inflow: number;
  outflow: number;
}

export interface DashboardSummary {
  range: DashboardRange;
  kpis: Kpi[];
  cashflow: CashflowPoint[];
}
