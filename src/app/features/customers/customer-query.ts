import {
  CUSTOMER_STATUSES,
  type CustomerStatus,
  RISK_LEVELS,
  type RiskLevel,
  type Segment,
  SEGMENTS,
} from './customers.models';

/**
 * The customers list query — the single source of truth for filters, sorting and paging.
 * It lives in the URL; the same parser validates it in the browser and in the (mock) API.
 */

export const CUSTOMER_SORT_KEYS = ['name', 'balance', 'lastActivity'] as const;
export type CustomerSortKey = (typeof CUSTOMER_SORT_KEYS)[number];
export type SortDirection = 'asc' | 'desc';

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export interface CustomerQuery {
  q: string;
  segment: Segment | null;
  risk: RiskLevel | null;
  status: CustomerStatus | null;
  sort: CustomerSortKey;
  dir: SortDirection;
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_CUSTOMER_QUERY: CustomerQuery = {
  q: '',
  segment: null,
  risk: null,
  status: null,
  sort: 'name',
  dir: 'asc',
  page: 1,
  pageSize: 25,
};

/** Natural first direction when a column becomes the sort key. */
export const DEFAULT_SORT_DIRECTION: Record<CustomerSortKey, SortDirection> = {
  name: 'asc',
  balance: 'desc',
  lastActivity: 'desc',
};

type RawParams = Readonly<Record<string, string | null | undefined>>;

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | null =>
  allowed.includes(value as T) ? (value as T) : null;

const positiveInt = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
};

/** Lenient parse: anything invalid falls back to its default instead of failing. */
export function parseCustomerQuery(params: RawParams): CustomerQuery {
  const d = DEFAULT_CUSTOMER_QUERY;
  const pageSize = positiveInt(params['pageSize']);
  return {
    q: (params['q'] ?? '').trim().slice(0, 100),
    segment: oneOf(SEGMENTS, params['segment']),
    risk: oneOf(RISK_LEVELS, params['risk']),
    status: oneOf(CUSTOMER_STATUSES, params['status']),
    sort: oneOf(CUSTOMER_SORT_KEYS, params['sort']) ?? d.sort,
    dir: oneOf(['asc', 'desc'] as const, params['dir']) ?? d.dir,
    page: positiveInt(params['page']) ?? d.page,
    pageSize: PAGE_SIZES.includes(pageSize as PageSize) ? (pageSize as PageSize) : d.pageSize,
  };
}

/** Full set of params for the API request (defaults included, empty filters omitted). */
export function toApiParams(query: CustomerQuery): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== '') params[key] = String(value);
  }
  return params;
}

/**
 * URL query params. Defaults map to `null`, which removes them from the URL
 * (with `queryParamsHandling: 'merge'`) — clean, shareable links.
 */
export function toUrlParams(query: CustomerQuery): Record<string, string | null> {
  const params: Record<string, string | null> = {};
  for (const key of Object.keys(query) as (keyof CustomerQuery)[]) {
    const value = query[key];
    params[key] = value === DEFAULT_CUSTOMER_QUERY[key] || value === '' ? null : String(value);
  }
  return params;
}
