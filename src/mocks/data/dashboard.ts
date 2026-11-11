import type {
  CashflowPoint,
  DashboardRange,
  DashboardSummary,
  Kpi,
} from '../../app/features/dashboard/dashboard.models';

interface MonthRecord extends CashflowPoint {
  flagged: number;
}

const HISTORY_MONTHS = 24;
const RANGE_MONTHS: Record<DashboardRange, number> = { '3m': 3, '6m': 6, '12m': 12 };

/** Small seeded PRNG (mulberry32) so the demo data is identical on every load. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const isoMonth = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** Two years of monthly history ending last month: gentle growth + seasonality + noise. */
function buildHistory(): MonthRecord[] {
  const random = seededRandom(20260101);
  const now = new Date();
  return Array.from({ length: HISTORY_MONTHS }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - HISTORY_MONTHS + i, 1);
    const growth = 1 + i * 0.012;
    const season = 1 + 0.08 * Math.sin((date.getMonth() / 12) * 2 * Math.PI);
    const inflow = 4_200_000 * growth * season * (0.94 + random() * 0.12);
    const outflow = inflow * (0.78 + random() * 0.14);
    return {
      month: isoMonth(date),
      inflow: Math.round(inflow),
      outflow: Math.round(outflow),
      flagged: Math.round(28 + random() * 30 - i * 0.4),
    };
  });
}

const sum = (records: MonthRecord[], pick: (r: MonthRecord) => number) =>
  records.reduce((total, record) => total + pick(record), 0);

export function buildDashboardSummary(range: DashboardRange): DashboardSummary {
  const history = buildHistory();
  const months = RANGE_MONTHS[range];
  const current = history.slice(-months);
  const previous = history.slice(-months * 2, -months);

  const kpi = (
    id: Kpi['id'],
    label: string,
    pick: (r: MonthRecord) => number,
    format: Kpi['format'],
    higherIsBetter: boolean,
  ): Kpi => ({
    id,
    label,
    value: sum(current, pick),
    previous: sum(previous, pick),
    format,
    higherIsBetter,
  });

  return {
    range,
    kpis: [
      kpi('inflow', 'Total inflow', (r) => r.inflow, 'currency', true),
      kpi('outflow', 'Total outflow', (r) => r.outflow, 'currency', false),
      kpi('net', 'Net cash flow', (r) => r.inflow - r.outflow, 'currency', true),
      kpi('flagged', 'Flagged transactions', (r) => r.flagged, 'count', false),
    ],
    cashflow: current.map(({ month, inflow, outflow }) => ({ month, inflow, outflow })),
  };
}
