import { Component, computed, input, output } from '@angular/core';

import { formatFull } from '../utils/format';
import { Icon, type IconName } from './icon';

const NAV_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400';

/** Server-side pagination controls. Stateless: emits intents, the parent owns the state. */
@Component({
  selector: 'app-paginator',
  imports: [Icon],
  template: `
    <p class="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
      @if (total() === 0) {
        No results
      } @else {
        Showing <span class="font-medium text-slate-900 dark:text-white">{{ range().from }}</span
        >–<span class="font-medium text-slate-900 dark:text-white">{{ range().to }}</span> of
        <span class="font-medium text-slate-900 dark:text-white">{{ range().total }}</span>
      }
    </p>

    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        Rows per page
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
        Page {{ page() }} of {{ lastPage() }}
      </span>

      <div class="flex gap-1">
        @for (b of buttons(); track b.label) {
          <button
            type="button"
            class="${NAV_BUTTON}"
            [attr.aria-label]="b.label"
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
    'aria-label': 'Pagination',
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

  protected readonly range = computed(() => {
    const from = (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(this.page() * this.pageSize(), this.total());
    return {
      from: formatFull(from, 'count'),
      to: formatFull(to, 'count'),
      total: formatFull(this.total(), 'count'),
    };
  });

  protected readonly buttons = computed(() => {
    const page = this.page();
    const last = this.lastPage();
    const button = (label: string, icon: IconName, target: number, disabled: boolean) => ({
      label,
      icon,
      target,
      disabled,
    });
    return [
      button('First page', 'chevronDoubleLeft', 1, page <= 1),
      button('Previous page', 'chevronLeft', page - 1, page <= 1),
      button('Next page', 'chevronRight', page + 1, page >= last),
      button('Last page', 'chevronDoubleRight', last, page >= last),
    ];
  });

  protected onPageSizeChange(event: Event): void {
    this.pageSizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
