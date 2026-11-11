import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, computed, inject } from '@angular/core';

import { Icon } from '../../shared/ui/icon';
import { I18n } from './i18n.service';
import { type Locale, LOCALE_NAMES, LOCALE_SHORT, LOCALES } from './locale';
import { TranslatePipe } from './translate.pipe';

/** Language menu (radio items). Used in the top bar and on the sign-in page. */
@Component({
  selector: 'app-locale-switcher',
  imports: [CdkMenu, CdkMenuItemRadio, CdkMenuTrigger, Icon, TranslatePipe],
  template: `
    <button
      type="button"
      [cdkMenuTriggerFor]="menu"
      [attr.aria-label]="'locale.trigger' | t: { name: currentName() }"
      class="inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-blue-400"
    >
      <app-icon name="language" />
      <span aria-hidden="true">{{ currentShort() }}</span>
    </button>

    <ng-template #menu>
      <div
        cdkMenu
        [attr.aria-label]="'locale.label' | t"
        class="mt-2 w-52 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
      >
        @for (locale of locales; track locale) {
          <button
            type="button"
            cdkMenuItemRadio
            [cdkMenuItemChecked]="locale === i18n.locale()"
            [attr.lang]="locale"
            (cdkMenuItemTriggered)="select(locale)"
            class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
          >
            {{ names[locale] }}
            @if (locale === i18n.locale()) {
              <app-icon name="check" class="size-4 text-blue-700 dark:text-blue-400" />
            }
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class LocaleSwitcher {
  protected readonly i18n = inject(I18n);
  protected readonly locales = LOCALES;
  protected readonly names = LOCALE_NAMES;
  protected readonly currentName = computed(() => LOCALE_NAMES[this.i18n.locale()]);
  protected readonly currentShort = computed(() => LOCALE_SHORT[this.i18n.locale()]);

  protected select(locale: Locale): void {
    void this.i18n.use(locale);
  }
}
