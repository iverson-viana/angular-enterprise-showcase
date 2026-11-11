import { inject, Pipe, type PipeTransform } from '@angular/core';

import { I18n } from './i18n.service';
import type { MessageKey, MessageParams } from './translate';

/**
 * `{{ 'customers.title' | t }}` / `{{ 'shell.role' | t: { role } }}`.
 *
 * Impure on purpose: a pure pipe is skipped while its arguments are unchanged, so it would
 * never re-read the dictionary signal after a language switch. The lookup is a few property
 * reads, and with OnPush + zoneless it only runs when its view is actually checked.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: MessageKey, params?: MessageParams): string {
    return this.i18n.t(key, params);
  }
}
