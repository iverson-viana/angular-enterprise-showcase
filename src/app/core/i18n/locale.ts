import { signal } from '@angular/core';

export const LOCALES = ['en-US', 'pt-BR'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en-US';

/** Endonyms: each language is offered in its own name (and tagged with its own `lang`). */
export const LOCALE_NAMES: Record<Locale, string> = {
  'en-US': 'English',
  'pt-BR': 'Português (Brasil)',
};
export const LOCALE_SHORT: Record<Locale, string> = { 'en-US': 'EN', 'pt-BR': 'PT' };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/** Closest supported locale for a BCP 47 tag such as `pt-PT` or `en-GB`. */
export const matchLocale = (tag: string | undefined): Locale =>
  tag?.toLowerCase().startsWith('pt') ? 'pt-BR' : DEFAULT_LOCALE;

const active = signal<Locale>(DEFAULT_LOCALE);

/**
 * The active locale as a signal. Formatters read it, so any `computed()` that formats a number
 * or date re-runs on a language switch without each caller passing the locale around.
 * Written only by `I18n.use()`.
 */
export const activeLocale = active.asReadonly();

/** @internal Use `I18n.use()` instead — it also swaps the messages and updates `<html lang>`. */
export const setActiveLocale = (locale: Locale): void => active.set(locale);
