import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { CashflowChart } from './cashflow-chart';
import {
  DASHBOARD_RANGES,
  type DashboardRange,
  type DashboardSummary,
  isDashboardRange,
} from './dashboard.models';
import { StatTile } from './stat-tile';

const DEFAULT_RANGE: DashboardRange = '12m';
const RANGE_LABELS: Record<DashboardRange, string> = {
  '3m': '3 months',
  '6m': '6 months',
  '12m': '12 months',
};

@Component({
  selector: 'app-dashboard-page',
  imports: [StatTile, CashflowChart],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);

  /** `?range=` query param (withComponentInputBinding). Unknown values fall back to the default. */
  readonly range = input<string>();

  protected readonly ranges = DASHBOARD_RANGES.map((value) => ({
    value,
    label: RANGE_LABELS[value],
  }));
  protected readonly selectedRange = computed<DashboardRange>(() => {
    const range = this.range();
    return isDashboardRange(range) ? range : DEFAULT_RANGE;
  });
  protected readonly periodLabel = computed(() => RANGE_LABELS[this.selectedRange()]);

  private readonly summaryResource = httpResource<DashboardSummary>(
    () => `/api/dashboard?range=${this.selectedRange()}`,
  );

  /**
   * Last successfully loaded summary. A new range puts the resource back in `loading`
   * (value → undefined); keeping the previous frame avoids a skeleton flash on refetch.
   */
  protected readonly summary = linkedSignal<
    DashboardSummary | undefined,
    DashboardSummary | undefined
  >({
    source: () => (this.summaryResource.hasValue() ? this.summaryResource.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });

  protected readonly isRefreshing = computed(
    () => this.summaryResource.isLoading() && this.summary() !== undefined,
  );
  protected readonly hasError = computed(() => this.summaryResource.error() !== undefined);

  protected selectRange(range: DashboardRange): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { range: range === DEFAULT_RANGE ? null : range },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    this.summaryResource.reload();
  }
}
