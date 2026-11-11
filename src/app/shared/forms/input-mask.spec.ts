import { applyMask, caretAfter, integerMask, patternMask } from './input-mask';

describe('input masks', () => {
  describe('patternMask', () => {
    const cnpj = patternMask('**.***.***/****-00');

    it('keeps only characters that fit the slots, uppercased', () => {
      expect(cnpj.clean('12.abc.345/01de-35')).toBe('12ABC34501DE35');
      expect(cnpj.clean('12.ABC.345/01DE-3X5')).toBe('12ABC34501DE35');
    });

    it('drops input beyond the last slot', () => {
      expect(patternMask('00-0000000').clean('1234567890')).toBe('123456789');
    });

    it('formats progressively without a dangling literal', () => {
      expect(cnpj.format('12')).toBe('12');
      expect(cnpj.format('12A')).toBe('12.A');
      expect(cnpj.format('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
    });
  });

  describe('integerMask', () => {
    const amount = integerMask();

    it('strips non-digits and leading zeros', () => {
      expect(amount.clean('$ 001,250,000')).toBe('1250000');
      expect(amount.clean('0')).toBe('0');
      expect(amount.clean('')).toBe('');
    });

    it('groups thousands', () => {
      expect(amount.format('1250000')).toBe('1,250,000');
      expect(amount.format('')).toBe('');
    });
  });

  it('caretAfter skips literals', () => {
    expect(caretAfter('12-345', 0)).toBe(0);
    expect(caretAfter('12-345', 2)).toBe(2);
    expect(caretAfter('12-345', 3)).toBe(4);
    expect(caretAfter('12-345', 9)).toBe(6);
  });

  describe('applyMask', () => {
    function typeInto(value: string, caret: number): HTMLInputElement {
      const input = document.createElement('input');
      document.body.append(input);
      input.focus();
      input.value = value;
      input.setSelectionRange(caret, caret);
      return input;
    }

    afterEach(() => document.body.replaceChildren());

    it('reformats and returns the clean value', () => {
      const input = typeInto('123', 3);
      expect(applyMask(input, patternMask('00-0000000'))).toBe('123');
      expect(input.value).toBe('12-3');
      expect(input.selectionStart).toBe(4);
    });

    it('keeps the caret next to a digit inserted in the middle', () => {
      // "1,000" → user types "5" after the "1" → "15,000" (caret after the 5).
      const input = typeInto('15,000', 2);
      expect(applyMask(input, integerMask())).toBe('15000');
      expect(input.value).toBe('15,000');
      expect(input.selectionStart).toBe(2);

      // "15,000" → types "2" after the 5 → "152,000"; the comma moves, the caret follows the 2.
      input.value = '152,000';
      input.setSelectionRange(3, 3);
      applyMask(input, integerMask());
      expect(input.value).toBe('152,000');
      expect(input.selectionStart).toBe(3);

      // "152,000" → types "9" → "1529,000" → regrouped as "1,529,000", caret after the 9.
      input.value = '1529,000';
      input.setSelectionRange(4, 4);
      applyMask(input, integerMask());
      expect(input.value).toBe('1,529,000');
      expect(input.selectionStart).toBe(5);
    });
  });
});
