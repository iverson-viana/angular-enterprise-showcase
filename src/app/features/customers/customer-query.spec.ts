import {
  DEFAULT_CUSTOMER_QUERY,
  parseCustomerQuery,
  toApiParams,
  toUrlParams,
} from './customer-query';

describe('customer query', () => {
  it('defaults everything when params are empty', () => {
    expect(parseCustomerQuery({})).toEqual(DEFAULT_CUSTOMER_QUERY);
  });

  it('parses valid params', () => {
    expect(
      parseCustomerQuery({
        q: '  quillon ',
        segment: 'sme',
        risk: 'high',
        status: 'active',
        sort: 'balance',
        dir: 'desc',
        page: '3',
        pageSize: '50',
      }),
    ).toEqual({
      q: 'quillon',
      segment: 'sme',
      risk: 'high',
      status: 'active',
      sort: 'balance',
      dir: 'desc',
      page: 3,
      pageSize: 50,
    });
  });

  it('falls back to defaults for invalid values instead of failing', () => {
    expect(
      parseCustomerQuery({
        segment: 'retail',
        sort: 'password',
        dir: 'sideways',
        page: '-2',
        pageSize: '7',
      }),
    ).toEqual(DEFAULT_CUSTOMER_QUERY);
    expect(parseCustomerQuery({ page: '1.5' }).page).toBe(1);
  });

  it('drops defaults from the URL so links stay clean', () => {
    expect(toUrlParams({ ...DEFAULT_CUSTOMER_QUERY, risk: 'high', page: 2 })).toEqual({
      q: null,
      segment: null,
      risk: 'high',
      status: null,
      sort: null,
      dir: null,
      page: '2',
      pageSize: null,
    });
  });

  it('sends defaults to the API but omits empty filters', () => {
    expect(toApiParams(DEFAULT_CUSTOMER_QUERY)).toEqual({
      sort: 'name',
      dir: 'asc',
      page: '1',
      pageSize: '25',
    });
  });
});
