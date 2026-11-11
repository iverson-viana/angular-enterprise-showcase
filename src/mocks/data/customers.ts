import type { CustomerQuery, CustomerSortKey } from '../../app/features/customers/customer-query';
import type {
  Customer,
  CustomerStatus,
  RiskLevel,
  Segment,
} from '../../app/features/customers/customers.models';
import {
  CUSTOMER_COUNTRIES,
  type CustomerCountry,
  type CustomerDetails,
  type CustomerInput,
} from '../../app/features/customers/customer-form/customer-form.models';
import type { Page } from '../../app/shared/models/page';
import { pick, seededRandom } from '../random';
import { bankAccountFor, taxIdFor } from './identifiers';

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
const FIRST_NAMES = ['Ana', 'Bruno', 'Clara', 'Dmitri', 'Elena', 'Felix', 'Greta', 'Hugo', 'Ines'];
const LAST_NAMES = ['Alder', 'Brook', 'Castell', 'Dorne', 'Ellery', 'Fairfax', 'Grove', 'Hale'];

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
      country: pick(random, CUSTOMER_COUNTRIES),
      risk: pick(random, RISK_WEIGHTS),
      status: pick(random, STATUS_WEIGHTS),
      balance,
      lastActivity: lastActivity.toISOString().slice(0, 10),
    };
  });
}

let cache: Customer[] | undefined;
const customers = (): Customer[] => (cache ??= buildCustomers());
/** The full mock customer set (built once). Also used to link transactions to customers. */
export const allCustomers = (): readonly Customer[] => customers();

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase();

/** `excludeId` lets a customer keep (or re-case) its own name when edited. */
export function isCustomerNameTaken(name: string, excludeId?: string): boolean {
  const needle = normalizeName(name);
  return customers().some((c) => c.id !== excludeId && normalizeName(c.name) === needle);
}

export const findCustomer = (id: string): Customer | undefined =>
  customers().find((c) => c.id === id);

/** Onboarding data saved through the form (created or edited customers). */
const savedDetails = new Map<string, CustomerDetails>();

/** Details behind a table row: saved ones, or generated deterministically from the id. */
export function customerDetails(id: string): CustomerDetails | undefined {
  const saved = savedDetails.get(id);
  if (saved) return saved;
  const customer = findCustomer(id);
  if (!customer) return undefined;

  const random = seededRandom(Number(id.replace(/\D/g, '')));
  const country = customer.country as CustomerCountry;
  const monthlyVolume = Math.max(10_000, Math.round(customer.balance / 3 / 1000) * 1000);
  const domain = `${customer.name.split(' ')[0].toLowerCase()}.example`;
  const signatories = Array.from({ length: 1 + Math.floor(random() * 2) }, () => {
    const first = pick(random, FIRST_NAMES);
    const last = pick(random, LAST_NAMES);
    return { name: `${first} ${last}`, email: `${first}.${last}@${domain}`.toLowerCase() };
  });
  return {
    id,
    legalName: customer.name,
    segment: customer.segment,
    country,
    taxId: taxIdFor(country, random),
    bankAccount: bankAccountFor(country, random),
    monthlyVolume,
    creditLimit: Math.round((monthlyVolume * (0.5 + random() * 1.5)) / 1000) * 1000,
    // Generated data may repeat a pair; the form requires unique emails.
    signatories: signatories.filter(
      (s, i) => signatories.findIndex((o) => o.email === s.email) === i,
    ),
  };
}

const riskFor = ({ monthlyVolume, creditLimit }: CustomerInput): RiskLevel => {
  const ratio = monthlyVolume > 0 ? creditLimit / monthlyVolume : 0;
  return ratio > 2 ? 'high' : ratio > 1 ? 'medium' : 'low';
};

/** Adds a customer in onboarding (lives until the page reloads). Risk follows the credit ratio. */
export function createCustomer(input: CustomerInput): Customer {
  const list = customers();
  const customer: Customer = {
    id: `C-${10001 + list.length}`,
    name: input.legalName,
    segment: input.segment,
    country: input.country,
    risk: riskFor(input),
    status: 'onboarding',
    balance: 0,
    lastActivity: new Date().toISOString().slice(0, 10),
  };
  list.push(customer);
  savedDetails.set(customer.id, { id: customer.id, ...input });
  return customer;
}

/** Applies an edit to the table row and the saved details. */
export function updateCustomer(id: string, input: CustomerInput): Customer | undefined {
  const customer = findCustomer(id);
  if (!customer) return undefined;
  Object.assign(customer, {
    name: input.legalName,
    segment: input.segment,
    country: input.country,
    risk: riskFor(input),
  });
  savedDetails.set(id, { id, ...input });
  return customer;
}

const COMPARATORS: Record<CustomerSortKey, (a: Customer, b: Customer) => number> = {
  name: (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  balance: (a, b) => a.balance - b.balance,
  lastActivity: (a, b) => a.lastActivity.localeCompare(b.lastActivity),
};

/** Filters, sorts and paginates — what a real backend would do. Out-of-range pages clamp. */
export function queryCustomers(query: CustomerQuery): Page<Customer> {
  const needle = query.q.toLowerCase();
  const filtered = customers().filter(
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
