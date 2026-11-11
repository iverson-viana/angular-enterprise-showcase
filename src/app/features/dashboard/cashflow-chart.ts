import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { I18n } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/translate';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { formatCompact, formatFull, formatMonth } from '../../shared/utils/format';
import { niceTicks } from './chart-scale';
import type { CashflowPoint } from './dashboard.models';

const HEIGHT = 280;
const MARGIN = { top: 16, right: 76, bottom: 32, left: 56 } as const;
/** Minimum horizontal room per x-axis label before labels are thinned out. */
const MIN_LABEL_SPACING = 56;
/** End labels closer than this would collide — fall back to the legend instead of nudging. */
const MIN_END_LABEL_GAP = 16;

interface Series {
  key: 'inflow' | 'outflow';
  labelKey: MessageKey;
  /** Tailwind classes bound to the validated data-viz tokens in styles.css. */
  strokeClass: string;
  fillClass: string;
  keyClass: string;
}

const SERIES: readonly Series[] = [
  {
    key: 'inflow',
    labelKey: 'chart.inflow',
    strokeClass: 'stroke-(--viz-series-1)',
    fillClass: 'fill-(--viz-series-1)',
    keyClass: 'bg-(--viz-series-1)',
  },
  {
    key: 'outflow',
    labelKey: 'chart.outflow',
    strokeClass: 'stroke-(--viz-series-2)',
    fillClass: 'fill-(--viz-series-2)',
    keyClass: 'bg-(--viz-series-2)',
  },
];

/**
 * Two-series monthly line chart (one shared USD axis). Hand-rolled SVG — no chart library:
 * crosshair + tooltip on pointer and keyboard, live-region readout, and a table view.
 */
@Component({
  selector: 'app-cashflow-chart',
  imports: [TranslatePipe],
  templateUrl: './cashflow-chart.html',
  host: { class: 'block' },
})
export class CashflowChart {
  readonly points = input.required<CashflowPoint[]>();
  private readonly i18n = inject(I18n);

  protected readonly series = SERIES;
  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly width = signal(640);
  protected readonly activeIndex = signal<number | null>(null);

  private readonly plot = viewChild.required<ElementRef<HTMLElement>>('plot');

  protected readonly geometry = computed(() => {
    const points = this.points();
    const width = this.width();
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const max = Math.max(0, ...points.flatMap((p) => [p.inflow, p.outflow]));
    const ticks = niceTicks(max);
    const yMax = ticks[ticks.length - 1];

    const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
    const x = (i: number) => MARGIN.left + (points.length > 1 ? i * step : innerWidth / 2);
    const y = (value: number) => MARGIN.top + innerHeight - (value / yMax) * innerHeight;

    const every = Math.max(
      1,
      Math.ceil(points.length / Math.max(1, innerWidth / MIN_LABEL_SPACING)),
    );
    const last = points.length - 1;

    const lines = SERIES.map((s) => ({
      ...s,
      path: points
        .map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[s.key]).toFixed(1)}`)
        .join(''),
      endY: last >= 0 ? y(points[last][s.key]) : 0,
    }));
    const showEndLabels =
      lines.length === 2 && Math.abs(lines[0].endY - lines[1].endY) >= MIN_END_LABEL_GAP;

    return {
      width,
      innerWidth,
      innerHeight,
      step,
      x,
      y,
      lines,
      showEndLabels,
      endX: x(last),
      yTicks: ticks.map((value) => ({ y: y(value), label: formatCompact(value, 'currency') })),
      // Thin labels from the right so the most recent month is always labelled.
      xTicks: points
        .map((p, i) => ({
          x: x(i),
          label: formatMonth(p.month, 'short'),
          show: (last - i) % every === 0,
        }))
        .filter((t) => t.show),
    };
  });

  protected readonly active = computed(() => {
    const index = this.activeIndex();
    const point = index === null ? undefined : this.points()[index];
    if (!point || index === null) return null;
    const { x, y } = this.geometry();
    return {
      x: x(index),
      month: formatMonth(point.month, 'long'),
      rows: SERIES.map((s) => ({
        ...s,
        y: y(point[s.key]),
        value: formatFull(point[s.key], 'currency'),
      })),
      /** Flip the tooltip to the left of the crosshair on the right half of the plot. */
      alignRight: x(index) > this.width() / 2,
    };
  });

  protected readonly liveText = computed(() => {
    const active = this.active();
    return active
      ? `${active.month}: ${active.rows.map((r) => `${this.i18n.t(r.labelKey)} ${r.value}`).join(', ')}`
      : '';
  });

  protected readonly tableRows = computed(() =>
    this.points().map((p) => ({
      month: formatMonth(p.month, 'long'),
      inflow: formatFull(p.inflow, 'currency'),
      outflow: formatFull(p.outflow, 'currency'),
      net: formatFull(p.inflow - p.outflow, 'currency'),
    })),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) =>
        this.width.set(Math.max(320, Math.round(entry.contentRect.width))),
      );
      observer.observe(this.plot().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onPointerMove(event: PointerEvent): void {
    const { step } = this.geometry();
    const bounds = this.plot().nativeElement.getBoundingClientRect();
    const offset = event.clientX - bounds.left - MARGIN.left;
    const index = step ? Math.round(offset / step) : 0;
    this.activeIndex.set(this.clamp(index));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const current = this.activeIndex() ?? this.points().length - 1;
    const next: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: this.points().length - 1,
    };
    if (!(event.key in next)) return;
    event.preventDefault();
    this.activeIndex.set(this.clamp(next[event.key]));
  }

  protected onFocus(): void {
    if (this.activeIndex() === null) this.activeIndex.set(this.points().length - 1);
  }

  protected clearActive(): void {
    this.activeIndex.set(null);
  }

  private clamp(index: number): number {
    return Math.min(Math.max(index, 0), this.points().length - 1);
  }
}
