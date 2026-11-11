import {
  DEFAULT_TRANSACTION_FILTERS,
  MAX_TRANSACTIONS_PAGE_LIMIT,
} from '../../app/features/transactions/transaction-query';
import { queryTransactions, TRANSACTION_COUNT } from './transactions';

describe('queryTransactions (mock backend)', () => {
  it('walks the whole feed with cursors — no gaps, no duplicates, newest first', () => {
    const ids: string[] = [];
    const dates: string[] = [];
    let cursor: string | null = null;
    do {
      const page = queryTransactions(DEFAULT_TRANSACTION_FILTERS, cursor, 200);
      ids.push(...page.items.map((t) => t.id));
      dates.push(...page.items.map((t) => t.bookedAt));
      cursor = page.nextCursor;
    } while (cursor);

    expect(ids).toHaveLength(TRANSACTION_COUNT);
    expect(new Set(ids).size).toBe(TRANSACTION_COUNT);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('caps the page size', () => {
    const page = queryTransactions(DEFAULT_TRANSACTION_FILTERS, null, 10_000);
    expect(page.items).toHaveLength(MAX_TRANSACTIONS_PAGE_LIMIT);
  });

  it('filters and reports the filtered total', () => {
    const page = queryTransactions({ q: '', type: 'debit', status: 'flagged' }, null, 50);
    expect(page.total).toBeGreaterThan(0);
    expect(page.total).toBeLessThan(TRANSACTION_COUNT);
    expect(page.items.every((t) => t.type === 'debit' && t.status === 'flagged')).toBe(true);
  });

  it('ends the feed with a null cursor', () => {
    const page = queryTransactions({ q: 'TX-000001', type: null, status: null }, null, 100);
    expect(page.items.map((t) => t.id)).toContain('TX-000001');
    expect(page.nextCursor).toBeNull();
  });
});
