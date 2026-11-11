import { Component, computed, inject, input, output } from '@angular/core';

import { I18n } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/translate';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Icon, type IconName } from './icon';

const NAV_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400';

/** Server-side pagination controls. Stateless: emits intents, the parent owns the state. */
@Component({
  selector: 'app-paginator',
  imports: [Icon, TranslatePipe],
  template: `
    <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
      @if (total() === 0) {
        {{ 'paginator.noResults' | t }}
      } @else {
        {{ 'paginator.showing' | t: range() }}
      }
    </p>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        {{ 'paginator.rowsPerPage' | t }}
        <select
          class="rounded-md border border-slate-300 bg-white py-1 pr-8 pl-2 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          (change)="onPageSizeChange($event)"
        >
          @for (size of pageSizes(); track size) {
            <option [value]="size" [selected]="size === pageSize()">{{ size }}</option>
          }
        </select>
      </label>

      <span class="text-sm text-slate-600 dark:text-slate-300">
        {{ 'paginator.pageOf' | t: { page: page(), last: lastPage() } }}
      </span>

      <div class="flex gap-1">
        @for (b of buttons(); track b.labelKey) {
          <button
            type="button"
            class="${NAV_BUTTON}"
            [attr.aria-label]="b.labelKey | t"
            [disabled]="b.disabled"
            (click)="pageChange.emit(b.target)"
          >
            <app-icon [name]="b.icon" class="size-4" />
          </button>
        }
      </div>
    </div>
  `,
  host: {
    role: 'navigation',
    '[attr.aria-label]': 'navLabel()',
    class: 'flex flex-wrap items-center justify-between gap-3',
  },
})
export class Paginator {
  /** 1-based */
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageSizes = input<readonly number[]>([10, 25, 50, 100]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  protected readonly lastPage = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize())),
  );

  private readonly i18n = inject(I18n);
  protected readonly navLabel = computed(() => this.i18n.t('paginator.label'));

  /** Numbers are interpolated by the translator, formatted for the active locale. */
  protected readonly range = computed(() => ({
    from: (this.page() - 1) * this.pageSize() + 1,
    to: Math.min(this.page() * this.pageSize(), this.total()),
    total: this.total(),
  }));

  protected readonly buttons = computed(() => {
    const page = this.page();
    const last = this.lastPage();
    const button = (labelKey: MessageKey, icon: IconName, target: number, disabled: boolean) => ({
      labelKey,
      icon,
      target,
      disabled,
    });
    return [
      button('paginator.first', 'chevronDoubleLeft', 1, page <= 1),
      button('paginator.previous', 'chevronLeft', page - 1, page <= 1),
      button('paginator.next', 'chevronRight', page + 1, page >= last),
      button('paginator.last', 'chevronDoubleRight', last, page >= last),
    ];
  });

  protected onPageSizeChange(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
