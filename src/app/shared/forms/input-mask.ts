/**
 * An input mask keeps two representations of a value:
 * - `clean`: what the model stores (e.g. "123456780");
 * - `format`: what the user sees (e.g. "12-3456780").
 *
 * Literal characters in masks are never letters or digits, so "how many significant
 * characters precede the caret" is enough to restore the caret after reformatting.
 */
export interface InputMask {
  clean(raw: string): string;
  format(clean: string): string;
}

const TOKENS: Readonly<Record<string, RegExp>> = {
  '0': /\d/,
  A: /[A-Z]/,
  '*': /[A-Z0-9]/,
};

/**
 * Pattern mask. Tokens: `0` digit, `A` letter, `*` letter or digit; anything else is a literal.
 * Input is uppercased; characters that don't fit the next slot are dropped.
 */
export function patternMask(pattern: string): InputMask {
  const slots = [...pattern].filter((char) => char in TOKENS).map((char) => TOKENS[char]);
  return {
    clean(raw) {
      let out = '';
      for (const char of raw.toUpperCase()) {
        if (out.length === slots.length) break;
        if (slots[out.length].test(char)) out += char;
      }
      return out;
    },
    format(clean) {
      let out = '';
      let next = 0;
      for (const char of pattern) {
        if (next === clean.length) break;
        // Literals are only written when more input follows, so there is no dangling "-".
        out += char in TOKENS ? clean[next++] : char;
      }
      return out;
    },
  };
}

const groupFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Whole, non-negative amounts with thousands separators ("1250000" ⇄ "1,250,000"). */
export function integerMask(maxDigits = 13): InputMask {
  return {
    clean: (raw) =>
      raw
        .replace(/\D/g, '')
        .replace(/^0+(?=\d)/, '')
        .slice(0, maxDigits),
    format: (clean) => (clean === '' ? '' : groupFormatter.format(Number(clean))),
  };
}

const SIGNIFICANT = /[A-Za-z0-9]/;

/** Index in `formatted` right after its `count`-th significant character. */
export function caretAfter(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (SIGNIFICANT.test(formatted[i]) && ++seen === count) return i + 1;
  }
  return formatted.length;
}

/**
 * Re-applies `mask` to a native input after the user typed, keeping the caret next to the
 * character they just edited. Returns the clean value for the model.
 */
export function applyMask(input: HTMLInputElement, mask: InputMask): string {
  const caret = input.selectionStart ?? input.value.length;
  const significantBefore = mask.clean(input.value.slice(0, caret)).length;
  const clean = mask.clean(input.value);
  const formatted = mask.format(clean);

  if (input.value !== formatted) input.value = formatted;
  if (input.ownerDocument.activeElement === input) {
    const position = caretAfter(formatted, significantBefore);
    input.setSelectionRange(position, position);
  }
  return clean;
}
