import { Component, computed, input } from '@angular/core';

import { Icon } from '../../shared/ui/icon';
import {
  formatCompact,
  formatFull,
  formatSignedPercent,
  relativeChange,
} from '../../shared/utils/format';
import type { Kpi } from './dashboard.models';

type Tone = 'good' | 'bad' | 'neutral';

const TONE_CLASSES: Record<Tone, string> = {
  good: 'text-green-700 dark:text-green-400',
  bad: 'text-red-700 dark:text-red-400',
  neutral: 'text-slate-600 dark:text-slate-300',
};

/** KPI stat tile: label · value · delta vs the previous period (direction × whether up is good). */
@Component({
  selector: 'app-stat-tile',
  imports: [Icon],
  template: `
    <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ kpi().label }}</h2>
    <p class="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
      <data [value]="kpi().value" [title]="fullValue()">{{ compactValue() }}</data>
    </p>
    <p class="mt-2 flex items-center gap-1 text-sm">
      @if (delta(); as d) {
        <span class="inline-flex items-center gap-0.5 font-medium" [class]="toneClass()">
          @if (d.direction !== 'flat') {
            <app-icon [name]="d.direction === 'up' ? 'arrowUp' : 'arrowDown'" class="size-4" />
          }
          {{ d.label }}
          <span class="sr-only"
            >({{
              d.tone === 'neutral' ? 'no change' : d.tone === 'good' ? 'favorable' : 'unfavorable'
            }})</span
          >
        </span>
      } @else {
        <span class="font-medium text-slate-600 dark:text-slate-300">—</span>
      }
      <span class="text-slate-600 dark:text-slate-300">vs previous {{ periodLabel() }}</span>
    </p>
  `,
  host: {
    class:
      'block rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900',
  },
})
export class StatTile {
  readonly kpi = input.required<Kpi>();
  /** e.g. "12 months" */
  readonly periodLabel = input.required<string>();

  protected readonly compactValue = computed(() =>
    formatCompact(this.kpi().value, this.kpi().format),
  );
  protected readonly fullValue = computed(() => formatFull(this.kpi().value, this.kpi().format));

  protected readonly delta = computed(() => {
    const { value, previous, higherIsBetter } = this.kpi();
    const change = relativeChange(value, previous);
    if (change === null) return null;

    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const tone: Tone =
      direction === 'flat' ? 'neutral' : change > 0 === higherIsBetter ? 'good' : 'bad';
    return { direction, tone, label: formatSignedPercent(change) } as const;
  });

  protected readonly toneClass = computed(() => TONE_CLASSES[this.delta()?.tone ?? 'neutral']);
}
