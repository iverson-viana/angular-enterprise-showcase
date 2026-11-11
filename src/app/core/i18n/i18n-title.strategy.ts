import { effect, inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { I18n } from './i18n.service';
import type { MessageKey } from './translate';

const APP_NAME = 'Ledgerly';

/** Typed route title: `title: pageTitle('pages.customers')` fails to compile on a bad key. */
export const pageTitle = (key: MessageKey): MessageKey => key;

/**
 * Route `title`s are message keys. The document title is "<translated page> · Ledgerly",
 * and follows language switches without a navigation.
 */
@Injectable()
export class I18nTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18n);
  private readonly key = signal<MessageKey | null>(null);

  constructor() {
    super();
    effect(() => {
      const key = this.key();
      this.title.setTitle(key ? `${this.i18n.t(key)} · ${APP_NAME}` : APP_NAME);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.key.set((this.buildTitle(snapshot) as MessageKey | undefined) ?? null);
  }
}
