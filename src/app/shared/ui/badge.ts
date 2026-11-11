import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<BadgeTone, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-green-50 text-green-800 ring-green-600/20 dark:bg-green-950 dark:text-green-300',
    dot: 'bg-green-600 dark:bg-green-400',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-900 ring-amber-600/30 dark:bg-amber-950 dark:text-amber-300',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  danger: {
    badge: 'bg-red-50 text-red-800 ring-red-600/20 dark:bg-red-950 dark:text-red-300',
    dot: 'bg-red-600 dark:bg-red-400',
  },
  info: {
    badge: 'bg-blue-50 text-blue-800 ring-blue-600/20 dark:bg-blue-950 dark:text-blue-300',
    dot: 'bg-blue-600 dark:bg-blue-400',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300',
    dot: 'bg-slate-500 dark:bg-slate-400',
  },
};

/** Status pill. The projected text always carries the meaning — color only reinforces it. */
@Component({
  selector: 'app-badge',
  template: `
    <span aria-hidden="true" class="size-1.5 rounded-full" [class]="classes().dot"></span>
    <ng-content />
  `,
  host: {
    class:
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
    '[class]': 'classes().badge',
  },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  protected readonly classes = computed(() => TONES[this.tone()]);
}
