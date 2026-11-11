/** Display formatting. Locale is fixed for now; i18n will make it configurable. */
const LOCALE = 'en-US';

export type ValueFormat = 'currency' | 'count';

const compactCurrency = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fullCurrency = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const compactNumber = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fullNumber = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const signedPercent = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

/** `$4.2M`, `1,284`, `12.9K` — counts stay in full below 10,000. */
export function formatCompact(value: number, format: ValueFormat): string {
  if (format === 'currency') return compactCurrency.format(value);
  return Math.abs(value) < 10_000 ? fullNumber.format(value) : compactNumber.format(value);
}

/** `$4,213,567`, `1,284`. */
export function formatFull(value: number, format: ValueFormat): string {
  return format === 'currency' ? fullCurrency.format(value) : fullNumber.format(value);
}

/** Relative change, or `null` when there is no meaningful base to compare against. */
export function relativeChange(value: number, previous: number): number | null {
  return previous === 0 ? null : (value - previous) / Math.abs(previous);
}

/** `+4.2%`, `-1.3%`, `0%`. */
export function formatSignedPercent(ratio: number): string {
  return signedPercent.format(ratio);
}

const mediumDate = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' });
const regionNames = new Intl.DisplayNames(LOCALE, { type: 'region' });

/** ISO date (`2026-11-03`) → `Nov 3, 2026`. Parsed as a local calendar date (no TZ shift). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return mediumDate.format(new Date(year, month - 1, day));
}

/** ISO 3166-1 alpha-2 → `Germany`. Falls back to the code itself. */
export function countryName(code: string): string {
  return regionNames.of(code) ?? code;
}

/** ISO month (`2026-03`) → `Mar` (short) or `March 2026` (long). */
export function formatMonth(isoMonth: string, style: 'short' | 'long'): string {
  const [year, month] = isoMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(
    LOCALE,
    style === 'short' ? { month: 'short' } : { month: 'long', year: 'numeric' },
  ).format(date);
}
