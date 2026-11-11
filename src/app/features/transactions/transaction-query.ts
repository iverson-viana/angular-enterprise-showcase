import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type TransactionStatus,
  type TransactionType,
} from './transactions.models';

/** Feed filters. Lives in the URL; shared by the page and the (mock) API. */
export interface TransactionFilters {
  q: string;
  type: TransactionType | null;
  status: TransactionStatus | null;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = { q: '', type: null, status: null };

export const TRANSACTIONS_PAGE_LIMIT = 100;
export const MAX_TRANSACTIONS_PAGE_LIMIT = 200;

type RawParams = Readonly<Record<string, string | null | undefined>>;

const oneOf = <T extends string>(allowed: readonly T[], value: unknown): T | null =>
  allowed.includes(value as T) ? (value as T) : null;

export function parseTransactionFilters(params: RawParams): TransactionFilters {
  return {
    q: (params['q'] ?? '').trim().slice(0, 100),
    type: oneOf(TRANSACTION_TYPES, params['type']),
    status: oneOf(TRANSACTION_STATUSES, params['status']),
  };
}

export const sameFilters = (a: TransactionFilters, b: TransactionFilters): boolean =>
  a.q === b.q && a.type === b.type && a.status === b.status;

/** Non-empty filters only — used for both the URL and the API request. */
export function toFilterParams(filters: TransactionFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.q) params['q'] = filters.q;
  if (filters.type) params['type'] = filters.type;
  if (filters.status) params['status'] = filters.status;
  return params;
}
