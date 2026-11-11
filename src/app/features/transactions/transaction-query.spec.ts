import {
  DEFAULT_TRANSACTION_FILTERS,
  parseTransactionFilters,
  sameFilters,
  toFilterParams,
} from './transaction-query';

describe('transaction filters', () => {
  it('parses valid params and ignores invalid ones', () => {
    expect(parseTransactionFilters({ q: ' inv ', type: 'debit', status: 'flagged' })).toEqual({
      q: 'inv',
      type: 'debit',
      status: 'flagged',
    });
    expect(parseTransactionFilters({ type: 'refund', status: 'lost' })).toEqual(
      DEFAULT_TRANSACTION_FILTERS,
    );
  });

  it('compares filters by value', () => {
    expect(
      sameFilters({ q: 'a', type: null, status: null }, { q: 'a', type: null, status: null }),
    ).toBe(true);
    expect(
      sameFilters(DEFAULT_TRANSACTION_FILTERS, { ...DEFAULT_TRANSACTION_FILTERS, type: 'credit' }),
    ).toBe(false);
  });

  it('keeps only non-empty filters in params', () => {
    expect(toFilterParams(DEFAULT_TRANSACTION_FILTERS)).toEqual({});
    expect(toFilterParams({ q: 'x', type: null, status: 'pending' })).toEqual({
      q: 'x',
      status: 'pending',
    });
  });
});
