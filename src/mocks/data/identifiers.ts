import type {
  BankAccount,
  CustomerCountry,
} from '../../app/features/customers/customer-form/customer-form.models';
import {
  isValidAbaRouting,
  isValidCnpj,
  isValidDeVatId,
  isValidIban,
  isValidPtNif,
} from '../../app/shared/validation/checksums';

/**
 * Invented identifiers that pass the same checks as the form.
 * Check digits are found by trying candidates against the validators — no algorithm is duplicated.
 */
type Random = () => number;

const digits = (random: Random, count: number): string =>
  Array.from({ length: count }, () => Math.floor(random() * 10)).join('');

/** Appends the check suffix (of `width` digits) that makes `isValid` pass. */
function withCheckDigits(base: string, width: number, isValid: (v: string) => boolean): string {
  for (let n = 0; n < 10 ** width; n++) {
    const candidate = base + String(n).padStart(width, '0');
    if (isValid(candidate)) return candidate;
  }
  throw new Error(`No check digits for ${base}`);
}

export function taxIdFor(country: CustomerCountry, random: Random): string {
  switch (country) {
    case 'US':
      return digits(random, 9);
    case 'GB':
      return digits(random, 8);
    case 'DE':
      return withCheckDigits(
        `${1 + Math.floor(random() * 9)}${digits(random, 7)}`,
        1,
        isValidDeVatId,
      );
    case 'BR':
      return withCheckDigits(`${digits(random, 8)}0001`, 2, isValidCnpj);
    case 'PT':
      return withCheckDigits(`5${digits(random, 7)}`, 1, isValidPtNif);
  }
}

/** Basic bank account number (after country + check digits) lengths. */
const BBAN_LENGTHS: Record<Exclude<CustomerCountry, 'US'>, number> = {
  GB: 18,
  DE: 18,
  BR: 25,
  PT: 21,
};

export function bankAccountFor(country: CustomerCountry, random: Random): BankAccount {
  if (country === 'US') {
    return {
      routingNumber: withCheckDigits(digits(random, 8), 1, isValidAbaRouting),
      accountNumber: digits(random, 10),
    };
  }
  let bban = digits(random, BBAN_LENGTHS[country]);
  // GB uses a 4-letter bank code; BR ends with account type + owner letters.
  if (country === 'GB') bban = `LDGR${bban.slice(4)}`;
  if (country === 'BR') bban = `${bban.slice(0, 23)}C1`;
  for (let check = 2; check <= 98; check++) {
    const iban = `${country}${String(check).padStart(2, '0')}${bban}`;
    if (isValidIban(iban)) return { iban };
  }
  throw new Error(`No IBAN check digits for ${bban}`);
}
