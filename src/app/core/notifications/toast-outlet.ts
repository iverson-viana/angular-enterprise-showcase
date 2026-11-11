import { Component, computed, inject, input } from '@angular/core';

import { Icon, type IconName } from '../../shared/ui/icon';
import { type Toast, ToastService, type ToastTone } from './toast.service';

const TONES: Record<ToastTone, { icon: IconName; color: string }> = {
  success: { icon: 'checkCircle', color: 'text-green-700 dark:text-green-400' },
  info: { icon: 'infoCircle', color: 'text-blue-700 dark:text-blue-400' },
  warning: { icon: 'warning', color: 'text-amber-600 dark:text-amber-400' },
  error: { icon: 'xCircle', color: 'text-red-700 dark:text-red-400' },
};

@Component({
  selector: 'app-toast-item',
  imports: [Icon],
  template: `
    <app-icon [name]="tone().icon" class="mt-0.5 size-5" [class]="tone().color" />
    <p class="flex-1 text-sm text-slate-800 dark:text-slate-100">{{ toast().message }}</p>
    <button
      type="button"
      aria-label="Dismiss notification"
      (click)="toasts.dismiss(toast().id)"
      class="-m-1 inline-flex size-7 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white dark:focus-visible:ring-blue-400"
    >
      <app-icon name="close" class="size-4" />
    </button>
  `,
  host: {
    class:
      'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800',
  },
})
export class ToastItem {
  readonly toast = input.required<Toast>();
  protected readonly toasts = inject(ToastService);
  protected readonly tone = computed(() => TONES[this.toast().tone]);
}

/**
 * Renders toasts into two live regions that exist from page load (regions inserted later
 * are often not announced): errors interrupt (assertive), everything else waits (polite).
 * Items carry no live role themselves, so nothing is announced twice.
 */
@Component({
  selector: 'app-toast-outlet',
  imports: [ToastItem],
  template: `
    <section
      aria-label="Notifications"
      class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      (mouseenter)="toasts.pause()"
      (mouseleave)="toasts.resume()"
      (focusin)="toasts.pause()"
      (focusout)="toasts.resume()"
    >
      <!-- Not display:contents: some browsers drop such elements from the a11y tree. -->
      <div aria-live="assertive" class="flex w-full flex-col items-center gap-2 sm:items-end">
        @for (toast of errors(); track toast.id) {
          <app-toast-item [toast]="toast" />
        }
      </div>
      <div aria-live="polite" class="flex w-full flex-col items-center gap-2 sm:items-end">
        @for (toast of others(); track toast.id) {
          <app-toast-item [toast]="toast" />
        }
      </div>
    </section>
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(ToastService);

  protected readonly errors = computed(() =>
    this.toasts.toasts().filter((t) => t.tone === 'error'),
  );
  protected readonly others = computed(() =>
    this.toasts.toasts().filter((t) => t.tone !== 'error'),
  );
}
