import type { NewCustomerDraft } from './new-customer.models';

/** A draft that passes every rule (Brazil, alphanumeric CNPJ). Invented data. */
export const validDraft = (): NewCustomerDraft => ({
  company: {
    legalName: 'Quarrytide Holdings S.A.',
    segment: 'corporate',
    country: 'BR',
    taxId: '12ABC34501DE35',
  },
  banking: {
    iban: 'BR1800360305000010009795493C1',
    routingNumber: '',
    accountNumber: '',
    monthlyVolume: 250_000,
    creditLimit: 500_000,
  },
  signatories: [{ name: 'Ana Example', email: 'ana@quarrytide.test' }],
  kycConfirmed: true,
});
