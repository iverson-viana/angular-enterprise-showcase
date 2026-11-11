import {
  MAX_TRANSACTIONS_PAGE_LIMIT,
  type TransactionFilters,
} from '../../app/features/transactions/transaction-query';
import type {
  PaymentMethod,
  Transaction,
  TransactionStatus,
} from '../../app/features/transactions/transactions.models';
import type { CursorPage } from '../../app/shared/models/cursor-page';
import { pick, seededRandom } from '../random';
import { allCustomers } from './customers';

export const TRANSACTION_COUNT = 10_000;

const METHODS: readonly PaymentMethod[] = ['wire', 'wire', 'ach', 'ach', 'ach', 'sepa', 'card'];
const STATUSES: readonly TransactionStatus[] = [
  ...Array<TransactionStatus>(16).fill('completed'),
  'pending',
  'pending',
  'failed',
  'flagged',
];
const REFERENCE_PREFIXES = ['INV', 'PO', 'PAYROLL', 'FEE', 'REFUND', 'TRANSFER'];
const WINDOW_MS = 180 * 86_400_000;

/** Newest first, spread over the last 180 days. */
function buildTransactions(): Transaction[] {
  const random = seededRandom(31_415_926);
  const customers = allCustomers();
  const now = Date.now();
  const step = WINDOW_MS / TRANSACTION_COUNT;

  return Array.from({ length: TRANSACTION_COUNT }, (_, i) => {
    const customer = pick(random, customers);
    const type = random() < 0.55 ? 'credit' : 'debit';
    const method = pick(random, METHODS);
    const amount =
      Math.round((method === 'card' ? 5_000 : 250_000) * random() ** 3 * 100) / 100 + 10;
    return {
      id: `TX-${String(TRANSACTION_COUNT - i).padStart(6, '0')}`,
      bookedAt: new Date(now - i * step - random() * step).toISOString(),
      customerId: customer.id,
      customerName: customer.name,
      type,
      method,
      status: pick(random, STATUSES),
      amount,
      reference: `${pick(random, REFERENCE_PREFIXES)}-${Math.floor(random() * 900_000) + 100_000}`,
    };
  });
}

let cache: Transaction[] | undefined;
const allTransactions = () => (cache ??= buildTransactions());

/**
 * Cursor = offset into the filtered, newest-first list. Clients must treat it as opaque;
 * a real API would encode the last seen (bookedAt, id) instead.
 */
export function queryTransactions(
  filters: TransactionFilters,
  cursor: string | null,
  limit: number,
): CursorPage<Transaction> {
  const needle = filters.q.toLowerCase();
  const matches = allTransactions().filter(
    (t) =>
      (!needle ||
        t.id.toLowerCase().includes(needle) ||
        t.customerName.toLowerCase().includes(needle) ||
        t.reference.toLowerCase().includes(needle)) &&
      (!filters.type || t.type === filters.type) &&
      (!filters.status || t.status === filters.status),
  );

  const start = Math.max(0, Number.parseInt(cursor ?? '0', 10) || 0);
  const size = Math.min(Math.max(1, limit), MAX_TRANSACTIONS_PAGE_LIMIT);
  const end = start + size;
  return {
    items: matches.slice(start, end),
    nextCursor: end < matches.length ? String(end) : null,
    total: matches.length,
  };
}
