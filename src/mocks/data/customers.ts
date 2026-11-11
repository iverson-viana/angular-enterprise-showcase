import type { CustomerQuery, CustomerSortKey } from '../../app/features/customers/customer-query';
import type {
  Customer,
  CustomerStatus,
  RiskLevel,
  Segment,
} from '../../app/features/customers/customers.models';
import type { Page } from '../../app/shared/models/page';
import { pick, seededRandom } from '../random';

export const CUSTOMER_COUNT = 2000;

// Invented words only — no real company or client names.
const NAME_STEMS = [
  'Quillon',
  'Vantor',
  'Brightfold',
  'Corvane',
  'Lumora',
  'Tessaly',
  'Orvale',
  'Kestrion',
  'Halvery',
  'Mirenza',
  'Duskwell',
  'Pellaro',
  'Zantric',
  'Ostrova',
  'Fennick',
  'Calderon',
  'Marbeck',
  'Sorella',
  'Trevane',
  'Wyndale',
  'Altoria',
  'Bexley',
  'Cindral',
  'Rosmont',
];
const NAME_SECTORS = [
  'Logistics',
  'Foods',
  'Energy',
  'Health',
  'Capital',
  'Textiles',
  'Motors',
  'Pharma',
  'Retail',
  'Labs',
  'Construction',
  'Media',
  'Agro',
  'Telecom',
  'Shipping',
  'Systems',
];
const LEGAL_FORMS = ['Inc.', 'Ltd.', 'GmbH', 'S.A.', 'LLC', 'PLC', 'B.V.', 'S.p.A.'];
const COUNTRIES = ['US', 'GB', 'DE', 'BR', 'IT', 'ES', 'FR', 'NL', 'CA', 'MX', 'PT', 'IE'];

const SEGMENT_WEIGHTS: readonly Segment[] = [
  'corporate',
  'corporate',
  'corporate',
  'sme',
  'sme',
  'sme',
  'sme',
  'public',
  'financial',
];
const RISK_WEIGHTS: readonly RiskLevel[] = [
  'low',
  'low',
  'low',
  'low',
  'low',
  'medium',
  'medium',
  'medium',
  'high',
];
const STATUS_WEIGHTS: readonly CustomerStatus[] = [
  'active',
  'active',
  'active',
  'active',
  'active',
  'active',
  'onboarding',
  'suspended',
];
const BALANCE_SCALE: Record<Segment, number> = {
  corporate: 8_000_000,
  sme: 600_000,
  public: 15_000_000,
  financial: 40_000_000,
};

const DAY_MS = 86_400_000;

function buildCustomers(): Customer[] {
  const random = seededRandom(7_202_611);
  const today = Date.now();
  return Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
    const segment = pick(random, SEGMENT_WEIGHTS);
    // Skewed distribution: many small balances, a few very large ones.
    const balance = Math.round(BALANCE_SCALE[segment] * random() ** 2 * 100) / 100;
    const lastActivity = new Date(today - Math.floor(random() * 180) * DAY_MS);
    return {
      id: `C-${10001 + i}`,
      name: `${pick(random, NAME_STEMS)} ${pick(random, NAME_SECTORS)} ${pick(random, LEGAL_FORMS)}`,
      segment,
      country: pick(random, COUNTRIES),
      risk: pick(random, RISK_WEIGHTS),
      status: pick(random, STATUS_WEIGHTS),
      balance,
      lastActivity: lastActivity.toISOString().slice(0, 10),
    };
  });
}

let cache: Customer[] | undefined;
const allCustomers = () => (cache ??= buildCustomers());

const COMPARATORS: Record<CustomerSortKey, (a: Customer, b: Customer) => number> = {
  name: (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  balance: (a, b) => a.balance - b.balance,
  lastActivity: (a, b) => a.lastActivity.localeCompare(b.lastActivity),
};

/** Filters, sorts and paginates — what a real backend would do. Out-of-range pages clamp. */
export function queryCustomers(query: CustomerQuery): Page<Customer> {
  const needle = query.q.toLowerCase();
  const filtered = allCustomers().filter(
    (c) =>
      (!needle || c.name.toLowerCase().includes(needle) || c.id.toLowerCase().includes(needle)) &&
      (!query.segment || c.segment === query.segment) &&
      (!query.risk || c.risk === query.risk) &&
      (!query.status || c.status === query.status),
  );

  const compare = COMPARATORS[query.sort];
  const sorted = filtered.sort((a, b) => (query.dir === 'asc' ? compare(a, b) : compare(b, a)));

  const lastPage = Math.max(1, Math.ceil(sorted.length / query.pageSize));
  const page = Math.min(query.page, lastPage);
  const start = (page - 1) * query.pageSize;
  return {
    items: sorted.slice(start, start + query.pageSize),
    total: sorted.length,
    page,
    pageSize: query.pageSize,
  };
}
