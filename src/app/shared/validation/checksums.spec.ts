import {
  isValidAbaRouting,
  isValidCnpj,
  isValidDeVatId,
  isValidIban,
  isValidPtNif,
} from './checksums';

describe('checksums', () => {
  describe('isValidIban', () => {
    it.each([
      'GB82WEST12345698765432',
      'DE89370400440532013000',
      'PT50000201231234567890154',
      'BR1800360305000010009795493C1',
    ])('accepts the documented sample %s', (iban) => {
      expect(isValidIban(iban)).toBe(true);
    });

    it('rejects a wrong check digit', () => {
      expect(isValidIban('GB83WEST12345698765432')).toBe(false);
    });

    it('rejects a wrong length for a known country', () => {
      expect(isValidIban('GB82WEST1234569876543')).toBe(false);
    });

    it('rejects malformed input', () => {
      expect(isValidIban('')).toBe(false);
      expect(isValidIban('1282WEST12345698765432')).toBe(false);
    });
  });

  describe('isValidCnpj', () => {
    it('accepts a numeric CNPJ', () => {
      expect(isValidCnpj('11222333000181')).toBe(true);
    });

    it('accepts the alphanumeric format (July 2026)', () => {
      expect(isValidCnpj('12ABC34501DE35')).toBe(true);
    });

    it('rejects wrong check digits and repeated digits', () => {
      expect(isValidCnpj('11222333000182')).toBe(false);
      expect(isValidCnpj('11111111111111')).toBe(false);
    });

    it('rejects letters in the check digits', () => {
      expect(isValidCnpj('12ABC34501DE3A')).toBe(false);
    });
  });

  describe('isValidPtNif', () => {
    it('accepts a valid NIF and rejects a wrong check digit', () => {
      expect(isValidPtNif('123456789')).toBe(true);
      expect(isValidPtNif('123456780')).toBe(false);
    });
  });

  describe('isValidDeVatId', () => {
    it('accepts a valid VAT ID and rejects a wrong check digit', () => {
      expect(isValidDeVatId('123456788')).toBe(true);
      expect(isValidDeVatId('123456789')).toBe(false);
    });
  });

  describe('isValidAbaRouting', () => {
    it('accepts a valid routing number and rejects a wrong one', () => {
      expect(isValidAbaRouting('123456780')).toBe(true);
      expect(isValidAbaRouting('123456789')).toBe(false);
    });
  });
});
