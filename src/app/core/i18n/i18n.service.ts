import { DOCUMENT } from '@angular/common';
import { inject, Service, signal } from '@angular/core';

import { activeLocale, isLocale, type Locale, matchLocale, setActiveLocale } from './locale';
import { en } from './messages/en';
import { createTranslator, type Messages } from './translate';

export const LOCALE_STORAGE_KEY = 'ledgerly.locale';

/** English ships in the main bundle; other dictionaries are fetched when first used. */
const LOADERS: Record<Locale, () => Promise<Messages>> = {
  'en-US': () => Promise.resolve(en),
  'pt-BR': () => import('./messages/pt-BR').then((m) => m.ptBR),
};

/**
 * Runtime i18n on signals: switching language re-renders in place — no reload, no per-locale
 * build. Translations and formatters both read signals, so templates and `computed()`s that
 * use them update by themselves.
 */
@Service()
export class I18n {
  private readonly document = inject(DOCUMENT);
  private readonly messages = signal<Messages>(en);
  /** Guards against a slow dictionary load finishing after a newer switch. */
  private latestRequest = 0;

  readonly locale = activeLocale;

  /** Translate `key`, interpolating `{params}`. Reactive: reads the current dictionary. */
  readonly t = createTranslator(this.messages, activeLocale);

  /** Restores the saved choice, or follows the browser language on a first visit. */
  async init(): Promise<void> {
    const stored = this.readStored();
    await this.apply(stored ?? matchLocale(this.document.defaultView?.navigator.language));
  }

  /** Switches language and remembers the choice. */
  async use(locale: Locale): Promise<void> {
    // A switch overtaken by a newer one must not overwrite the newer saved choice.
    if (!(await this.apply(locale))) return;
    try {
      this.document.defaultView?.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Storage unavailable — the choice lasts for this session only.
    }
  }

  /** Resolves `false` when a newer switch started meanwhile (this one is dropped). */
  private async apply(locale: Locale): Promise<boolean> {
    const request = ++this.latestRequest;
    const messages = await LOADERS[locale]();
    if (request !== this.latestRequest) return false;

    this.messages.set(messages);
    setActiveLocale(locale);
    // Screen readers pick pronunciation from it (WCAG 3.1.1 Language of Page).
    this.document.documentElement.lang = locale;
    return true;
  }

  private readStored(): Locale | null {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(LOCALE_STORAGE_KEY);
      return isLocale(stored) ? stored : null;
    } catch {
      return null;
    }
  }
}
