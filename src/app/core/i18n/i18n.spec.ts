import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';

import { Paginator } from '../../shared/ui/paginator';
import { formatFull } from '../../shared/utils/format';
import { I18nTitleStrategy, pageTitle } from './i18n-title.strategy';
import { I18n, LOCALE_STORAGE_KEY } from './i18n.service';
import { activeLocale, setActiveLocale } from './locale';
import { en } from './messages/en';
import { ptBR } from './messages/pt-BR';
import { createTranslator, type Messages } from './translate';

/** Flattens a dictionary to `key → message` (plural forms as `key.one` / `key.other`). */
function flatten(node: object, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') out.set(prefix + key, value);
    else for (const [k, v] of flatten(value as object, `${prefix}${key}.`)) out.set(k, v);
  }
  return out;
}
const placeholders = (message: string) =>
  [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** jsdom under Node 26 exposes no Web Storage; give the window a real-enough one. */
class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

describe('i18n', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    });
  });

  afterEach(() => setActiveLocale('en-US'));

  describe('dictionaries', () => {
    it('pt-BR translates every English message with the same placeholders', () => {
      const english = flatten(en);
      const portuguese = flatten(ptBR);
      expect([...portuguese.keys()].sort()).toEqual([...english.keys()].sort());
      for (const [key, message] of english) {
        expect(placeholders(portuguese.get(key)!), key).toEqual(placeholders(message));
        expect(portuguese.get(key), key).not.toBe('');
      }
    });
  });

  describe('createTranslator', () => {
    const translate = (locale: 'en-US' | 'pt-BR', messages: Messages) =>
      createTranslator(
        () => messages,
        () => locale,
      );

    it('interpolates params and formats numbers for the locale', () => {
      const params = { from: 1, to: 25, total: 2000 };
      expect(translate('en-US', en)('paginator.showing', params)).toBe('Showing 1–25 of 2,000');
      expect(translate('pt-BR', ptBR)('paginator.showing', params)).toBe('Exibindo 1–25 de 2.000');
    });

    it('selects plural forms with the locale rules', () => {
      const t = translate('en-US', en);
      expect(t('customerForm.summary', { count: 1 })).toBe('There is 1 problem with this form');
      expect(t('customerForm.summary', { count: 3 })).toBe('There are 3 problems with this form');
      expect(translate('pt-BR', ptBR)('customerForm.summary', { count: 2 })).toBe(
        'Há 2 problemas neste formulário',
      );
    });

    it('leaves unknown placeholders visible instead of printing "undefined"', () => {
      expect(translate('en-US', en)('dashboard.welcome')).toBe('Welcome back, {name}.');
    });
  });

  describe('I18n service', () => {
    it('restores the saved language and tags the document with it', async () => {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'pt-BR');
      const i18n = TestBed.inject(I18n);
      await i18n.init();

      expect(i18n.locale()).toBe('pt-BR');
      expect(document.documentElement.lang).toBe('pt-BR');
      expect(i18n.t('pages.customers')).toBe('Clientes');
    });

    it('follows the browser language on a first visit', async () => {
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('pt-PT');
      const i18n = TestBed.inject(I18n);
      await i18n.init();
      expect(i18n.locale()).toBe('pt-BR');
      vi.restoreAllMocks();
    });

    it('switches language, persists it and makes formatters follow', async () => {
      const i18n = TestBed.inject(I18n);
      expect(formatFull(1_250_000, 'count')).toBe('1,250,000');

      await i18n.use('pt-BR');
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
      expect(activeLocale()).toBe('pt-BR');
      expect(formatFull(1_250_000, 'count')).toBe('1.250.000');

      await i18n.use('en-US');
      expect(i18n.t('pages.customers')).toBe('Customers');
    });

    it('keeps the latest choice when an earlier switch resolves later', async () => {
      const i18n = TestBed.inject(I18n);
      const slow = i18n.use('pt-BR'); // dynamic import: resolves after the next one
      const fast = i18n.use('en-US');
      await Promise.all([slow, fast]);
      expect(i18n.locale()).toBe('en-US');
      expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en-US');
    });
  });

  it('re-renders components in place on a switch (no reload)', async () => {
    const fixture = TestBed.createComponent(Paginator);
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('pageSize', 25);
    fixture.componentRef.setInput('total', 2000);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Showing 1–25 of 2,000');

    await TestBed.inject(I18n).use('pt-BR');
    await fixture.whenStable();
    expect(el.textContent).toContain('Exibindo 1–25 de 2.000');
    expect(el.getAttribute('aria-label')).toBe('Paginação');
  });

  it('translates route titles and updates them on a switch', async () => {
    @Component({ template: '' })
    class Blank {}

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'customers', title: pageTitle('pages.customers'), component: Blank },
        ]),
        { provide: TitleStrategy, useClass: I18nTitleStrategy },
      ],
    });
    await TestBed.inject(Router).navigateByUrl('/customers');
    TestBed.tick();
    const title = TestBed.inject(Title);
    expect(title.getTitle()).toBe('Customers · Ledgerly');

    await TestBed.inject(I18n).use('pt-BR');
    TestBed.tick();
    expect(title.getTitle()).toBe('Clientes · Ledgerly');
  });
});
