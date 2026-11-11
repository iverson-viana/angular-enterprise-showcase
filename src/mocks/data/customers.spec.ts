import { DEFAULT_CUSTOMER_QUERY } from '../../app/features/customers/customer-query';
import { CUSTOMER_COUNT, queryCustomers } from './customers';

const query = (patch: Partial<typeof DEFAULT_CUSTOMER_QUERY> = {}) =>
  queryCustomers({ ...DEFAULT_CUSTOMER_QUERY, ...patch });

describe('queryCustomers (mock backend)', () => {
  it('paginates the full set', () => {
    const page = query({ page: 2, pageSize: 10 });
    expect(page.total).toBe(CUSTOMER_COUNT);
    expect(page.items).toHaveLength(10);
    expect(page.page).toBe(2);
  });

  it('filters by every dimension at once', () => {
    const page = query({ segment: 'sme', risk: 'high', status: 'active', pageSize: 100 });
    expect(page.total).toBeGreaterThan(0);
    expect(page.total).toBeLessThan(CUSTOMER_COUNT);
    for (const c of page.items) {
      expect([c.segment, c.risk, c.status]).toEqual(['sme', 'high', 'active']);
    }
  });

  it('searches by name or ID, case-insensitively', () => {
    expect(query({ q: 'c-10001' }).items.map((c) => c.id)).toEqual(['C-10001']);
    const byName = query({ q: 'QUILLON', pageSize: 100 });
    expect(byName.items.every((c) => c.name.toLowerCase().includes('quillon'))).toBe(true);
  });

  it('sorts in both directions', () => {
    const desc = query({ sort: 'balance', dir: 'desc', pageSize: 100 }).items.map((c) => c.balance);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    const asc = query({ sort: 'lastActivity', dir: 'asc', pageSize: 100 }).items;
    expect(asc.map((c) => c.lastActivity)).toEqual(asc.map((c) => c.lastActivity).sort());
  });

  it('clamps an out-of-range page to the last one', () => {
    const page = query({ page: 9999, pageSize: 100 });
    expect(page.page).toBe(CUSTOMER_COUNT / 100);
    expect(page.items).toHaveLength(100);
  });

  it('returns an empty first page when nothing matches', () => {
    expect(query({ q: 'no such customer' })).toMatchObject({ items: [], total: 0, page: 1 });
  });
});
