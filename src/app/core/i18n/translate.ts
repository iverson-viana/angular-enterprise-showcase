import type { Locale } from './locale';
import type { en } from './messages/en';

/** A message that varies with a count (`{ one: '1 item', other: '{count} items' }`). */
export interface PluralForms {
  one: string;
  other: string;
}

type Widen<T> = T extends string ? string : { -readonly [K in keyof T]: Widen<T[K]> };

/** Shape every dictionary must match — derived from English, the source language. */
export type Messages = Widen<typeof en>;

type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string | PluralForms
    ? `${Prefix}${K}`
    : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Every translatable key, e.g. `'customers.title'`. Typos fail type-checking, templates included. */
export type MessageKey = Paths<Messages>;

/** Values for `{placeholders}`. Numbers are formatted for the locale; `count` also picks the plural. */
export type MessageParams = Readonly<Record<string, string | number>>;

export type Translate = (key: MessageKey, params?: MessageParams) => string;

function lookup(messages: Messages, key: string): string | PluralForms | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' || (typeof node === 'object' && node !== null && 'other' in node)
    ? (node as string | PluralForms)
    : undefined;
}

/** Pure translator over one dictionary. `I18n` wraps it in signals; tests and schemas can use it directly. */
export function createTranslator(messages: () => Messages, locale: () => Locale): Translate {
  return (key, params) => {
    const entry = lookup(messages(), key);
    if (entry === undefined) return key; // unreachable with typed keys; visible if it happens

    const currentLocale = locale();
    const template =
      typeof entry === 'string'
        ? entry
        : new Intl.PluralRules(currentLocale).select(Number(params?.['count'] ?? 0)) === 'one'
          ? entry.one
          : entry.other;
    if (!params) return template;

    const numbers = new Intl.NumberFormat(currentLocale);
    return template.replace(/\{(\w+)\}/g, (match, name: string) => {
      const value = params[name];
      if (value === undefined) return match;
      return typeof value === 'number' ? numbers.format(value) : value;
    });
  };
}
