/**
 * Pure check-digit algorithms for financial and tax identifiers.
 * Inputs are expected unmasked (no spaces or punctuation) and uppercase.
 */

/** Official IBAN lengths for the countries Ledgerly onboards plus common EU ones. */
const IBAN_LENGTHS: Readonly<Record<string, number>> = {
  BR: 29,
  DE: 22,
  ES: 24,
  FR: 27,
  GB: 22,
  IE: 22,
  IT: 27,
  NL: 18,
  PT: 25,
};

/** ISO 13616 IBAN: country length + mod-97 check. */
export function isValidIban(iban: string): boolean {
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expectedLength = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expectedLength !== undefined && iban.length !== expectedLength) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  // Letters become two digits (A=10 … Z=35); reduce piecewise to stay within safe integers.
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /\d/.test(char) ? char : String(char.charCodeAt(0) - 55);
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/**
 * Brazilian CNPJ, including the alphanumeric format in force since July 2026:
 * the 12 base characters may be letters (value = char code − 48), check digits stay numeric.
 */
export function isValidCnpj(cnpj: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) return false;
  const values = [...cnpj].map((char) => char.charCodeAt(0) - 48);
  const checkDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += values[i] * (((length - 1 - i) % 8) + 2);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return checkDigit(12) === values[12] && checkDigit(13) === values[13];
}

/** Portuguese NIF / NIPC: 9 digits, mod-11 check digit. */
export function isValidPtNif(nif: string): boolean {
  if (!/^[1-9]\d{8}$/.test(nif)) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(nif[i]) * (9 - i);
  const check = 11 - (sum % 11);
  return (check >= 10 ? 0 : check) === Number(nif[8]);
}

/** German VAT ID (USt-IdNr.) without the "DE" prefix: 9 digits, ISO 7064 MOD 11,10. */
export function isValidDeVatId(vatId: string): boolean {
  if (!/^[1-9]\d{8}$/.test(vatId)) return false;
  let product = 10;
  for (let i = 0; i < 8; i++) {
    const sum = (Number(vatId[i]) + product) % 10 || 10;
    product = (2 * sum) % 11;
  }
  const check = 11 - product;
  return (check === 10 ? 0 : check) === Number(vatId[8]);
}

/** US ABA routing number: weights 3-7-1, sum divisible by 10. */
export function isValidAbaRouting(routing: string): boolean {
  if (!/^\d{9}$/.test(routing)) return false;
  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(routing[i]) * weights[i % 3];
  return sum % 10 === 0;
}
