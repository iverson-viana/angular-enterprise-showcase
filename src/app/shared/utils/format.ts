import { activeLocale, type Locale } from '../../core/i18n/locale';

/**
 * Display formatting for the active locale. Each function reads the `activeLocale` signal,
 * so a `computed()` that formats re-runs on a language switch. Amounts are always USD;
 * only their presentation changes ("$1,250" vs "US$ 1.250").
 */
export type ValueFormat = 'currency' | 'count';

function createFormatters(locale: Locale) {
  return {
    compactCurrency: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }),
    fullCurrency: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }),
    currencyWithCents: new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    compactNumber: new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }),
    fullNumber: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    signedPercent: new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 1,
      signDisplay: 'exceptZero',
    }),
    mediumDateTime: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    mediumDate: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    shortMonth: new Intl.DateTimeFormat(locale, { month: 'short' }),
    longMonth: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    regionNames: new Intl.DisplayNames(locale, { type: 'region' }),
  };
}

/** Intl objects are costly to build; one set per locale, created on first use. */
const cache = new Map<Locale, ReturnType<typeof createFormatters>>();
function formatters() {
  const locale = activeLocale();
  let set = cache.get(locale);
  if (!set) cache.set(locale, (set = createFormatters(locale)));
  return set;
}

/** `$4.2M`, `1,284`, `12.9K` — counts stay in full below 10,000. */
export function formatCompact(value: number, format: ValueFormat): string {
  const f = formatters();
  if (format === 'currency') return f.compactCurrency.format(value);
  return Math.abs(value) < 10_000 ? f.fullNumber.format(value) : f.compactNumber.format(value);
}

/** `$4,213,567`, `1,284`. */
export function formatFull(value: number, format: ValueFormat): string {
  const f = formatters();
  return format === 'currency' ? f.fullCurrency.format(value) : f.fullNumber.format(value);
}

/** Relative change, or `null` when there is no meaningful base to compare against. */
export function relativeChange(value: number, previous: number): number | null {
  return previous === 0 ? null : (value - previous) / Math.abs(previous);
}

/** `+4.2%`, `-1.3%`, `0%`. */
export function formatSignedPercent(ratio: number): string {
  return formatters().signedPercent.format(ratio);
}

/** Signed money amount with cents: `+$1,234.50` / `−$1,234.50` (true minus sign). */
export function formatSignedAmount(value: number, direction: 'in' | 'out'): string {
  const amount = formatters().currencyWithCents.format(Math.abs(value));
  return `${direction === 'in' ? '+' : '−'}${amount}`;
}

/** ISO timestamp → `Nov 11, 2026, 2:05 PM` (viewer's time zone). */
export function formatDateTime(isoTimestamp: string): string {
  return formatters().mediumDateTime.format(new Date(isoTimestamp));
}

/** ISO date (`2026-11-03`) → `Nov 3, 2026`. Parsed as a local calendar date (no TZ shift). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return formatters().mediumDate.format(new Date(year, month - 1, day));
}

/** ISO 3166-1 alpha-2 → `Germany` / `Alemanha`. Falls back to the code itself. */
export function countryName(code: string): string {
  return formatters().regionNames.of(code) ?? code;
}

/** ISO month (`2026-03`) → `Mar` (short) or `March 2026` (long). */
export function formatMonth(isoMonth: string, style: 'short' | 'long'): string {
  const [year, month] = isoMonth.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const f = formatters();
  return (style === 'short' ? f.shortMonth : f.longMonth).format(date);
}
