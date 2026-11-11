import { type InputMask, patternMask } from '../../../shared/forms/input-mask';
import { isValidCnpj, isValidDeVatId, isValidPtNif } from '../../../shared/validation/checksums';
import type { Segment } from '../customers.models';

/** Jurisdictions Ledgerly operates in. Single source for the form and the mock data. */
export const CUSTOMER_COUNTRIES = ['US', 'GB', 'DE', 'BR', 'PT'] as const;
export type CustomerCountry = (typeof CUSTOMER_COUNTRIES)[number];

export interface TaxIdRule {
  label: string;
  mask: InputMask;
  /** Formatted example for the hint — invented, but passes the checksum. */
  example: string;
  isValid(clean: string): boolean;
}

export const TAX_ID_RULES: Record<CustomerCountry, TaxIdRule> = {
  US: {
    label: 'EIN',
    mask: patternMask('00-0000000'),
    example: '12-3456789',
    isValid: (v) => /^\d{9}$/.test(v),
  },
  GB: {
    label: 'Company number',
    mask: patternMask('********'),
    example: 'SC123456',
    isValid: (v) => /^(\d{8}|[A-Z]{2}\d{6})$/.test(v),
  },
  DE: {
    label: 'VAT ID (without DE)',
    mask: patternMask('000000000'),
    example: '123456788',
    isValid: isValidDeVatId,
  },
  BR: {
    label: 'CNPJ',
    mask: patternMask('**.***.***/****-00'),
    example: '12.ABC.345/01DE-35',
    isValid: isValidCnpj,
  },
  PT: {
    label: 'NIPC',
    mask: patternMask('000 000 000'),
    example: '123 456 789',
    isValid: isValidPtNif,
  },
};

/** IBAN everywhere except the US, which uses ABA routing + account number. */
export const usesIban = (country: CustomerCountry | ''): boolean => country !== 'US';

export const IBAN_MASK = patternMask('AA00 **** **** **** **** **** **** ****');
/** ISO 13616 documentation samples (not real accounts) for the hint, per country. */
export const IBAN_EXAMPLES: Record<Exclude<CustomerCountry, 'US'>, string> = {
  GB: 'GB82WEST12345698765432',
  DE: 'DE89370400440532013000',
  BR: 'BR1800360305000010009795493C1',
  PT: 'PT50000201231234567890154',
};
/** Accepts nothing — used while the tax ID has no country to follow. */
export const EMPTY_MASK = patternMask('');
export const ROUTING_MASK = patternMask('000000000');
export const ACCOUNT_MASK = patternMask('00000000000000000');

export const isValidAccountNumber = (v: string): boolean => /^\d{4,17}$/.test(v);

export const MIN_MONTHLY_VOLUME = 10_000;
/** Policy: credit can't exceed three months of expected volume. */
export const CREDIT_TO_VOLUME_RATIO = 3;
export const MAX_SIGNATORIES = 4;

export interface Signatory {
  name: string;
  email: string;
}

/** Form model. Empty strings / nulls stand for "not filled in yet". */
export interface CustomerDraft {
  company: {
    legalName: string;
    segment: Segment | '';
    country: CustomerCountry | '';
    taxId: string;
  };
  banking: {
    iban: string;
    routingNumber: string;
    accountNumber: string;
    monthlyVolume: number | null;
    creditLimit: number | null;
  };
  signatories: Signatory[];
  kycConfirmed: boolean;
}

export const emptySignatory = (): Signatory => ({ name: '', email: '' });

export const emptyCustomerDraft = (): CustomerDraft => ({
  company: { legalName: '', segment: '', country: '', taxId: '' },
  banking: {
    iban: '',
    routingNumber: '',
    accountNumber: '',
    monthlyVolume: null,
    creditLimit: null,
  },
  signatories: [emptySignatory()],
  kycConfirmed: false,
});

export type BankAccount = { iban: string } | { routingNumber: string; accountNumber: string };

/** Body of POST /api/customers and PUT /api/customers/:id. */
export interface CustomerInput {
  legalName: string;
  segment: Segment;
  country: CustomerCountry;
  taxId: string;
  bankAccount: BankAccount;
  monthlyVolume: number;
  creditLimit: number;
  signatories: Signatory[];
}

/** GET /api/customers/:id — the onboarding data behind a table row. */
export interface CustomerDetails extends CustomerInput {
  id: string;
}

/** 409 body: errors the server attaches to specific fields. */
export interface FieldErrorsResponse {
  message: string;
  fieldErrors?: Partial<Record<'legalName' | 'taxId', string>>;
}

export interface NameAvailability {
  available: boolean;
}

/** Maps a valid draft to the API contract (call only after validation passed). */
export function toCustomerInput(draft: CustomerDraft): CustomerInput {
  const { company, banking } = draft;
  const country = company.country as CustomerCountry;
  return {
    legalName: company.legalName.trim(),
    segment: company.segment as Segment,
    country,
    taxId: company.taxId,
    bankAccount: usesIban(country)
      ? { iban: banking.iban }
      : { routingNumber: banking.routingNumber, accountNumber: banking.accountNumber },
    monthlyVolume: banking.monthlyVolume ?? 0,
    creditLimit: banking.creditLimit ?? 0,
    signatories: draft.signatories.map((s) => ({ name: s.name.trim(), email: s.email.trim() })),
  };
}

/** Loads saved data into the form. KYC was confirmed when the customer was onboarded. */
export function toDraft(details: CustomerDetails): CustomerDraft {
  const account = details.bankAccount;
  return {
    company: {
      legalName: details.legalName,
      segment: details.segment,
      country: details.country,
      taxId: details.taxId,
    },
    banking: {
      iban: 'iban' in account ? account.iban : '',
      routingNumber: 'routingNumber' in account ? account.routingNumber : '',
      accountNumber: 'accountNumber' in account ? account.accountNumber : '',
      monthlyVolume: details.monthlyVolume,
      creditLimit: details.creditLimit,
    },
    signatories: details.signatories.map((s) => ({ ...s })),
    kycConfirmed: true,
  };
}
