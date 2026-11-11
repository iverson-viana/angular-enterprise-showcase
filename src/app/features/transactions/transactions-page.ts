import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import { Component, computed, inject, linkedSignal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, EMPTY, filter, map, switchMap } from 'rxjs';

import { I18n } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Badge, type BadgeTone } from '../../shared/ui/badge';
import { Icon } from '../../shared/ui/icon';
import { formatDateTime, formatSignedAmount } from '../../shared/utils/format';
import {
  DEFAULT_TRANSACTION_FILTERS,
  parseTransactionFilters,
  sameFilters,
  toFilterParams,
  type TransactionFilters,
} from './transaction-query';
import {
  type Transaction,
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type TransactionStatus,
} from './transactions.models';
import { TransactionsStore } from './transactions.store';

/** Must match the row height (h-14 = 56px) — fixed-size virtual scrolling. */
export const ROW_HEIGHT_PX = 56;
/** Start fetching the next page when the rendered range gets this close to the end. */
const PREFETCH_ROWS = 30;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_TONES: Record<TransactionStatus, BadgeTone> = {
  completed: 'success',
  pending: 'info',
  failed: 'danger',
  flagged: 'warning',
};

type FilterKey = 'type' | 'status';

@Component({
  selector: 'app-transactions-page',
  imports: [
    CdkVirtualScrollViewport,
    CdkFixedSizeVirtualScroll,
    CdkVirtualForOf,
    Badge,
    Icon,
    TranslatePipe,
  ],
  providers: [TransactionsStore],
  templateUrl: './transactions-page.html',
})
export class TransactionsPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(TransactionsStore);
  private readonly i18n = inject(I18n);

  protected readonly rowHeight = ROW_HEIGHT_PX;
  private readonly viewport = viewChild(CdkVirtualScrollViewport);

  private readonly filters$ = this.route.queryParams.pipe(
    map(parseTransactionFilters),
    distinctUntilChanged(sameFilters),
  );
  protected readonly filters = toSignal(this.filters$, {
    initialValue: DEFAULT_TRANSACTION_FILTERS,
  });

  protected readonly rows = computed(() =>
    this.store.items().map((tx) => ({
      ...tx,
      bookedAtLabel: formatDateTime(tx.bookedAt),
      methodLabel: this.i18n.t(`transactions.methods.${tx.method}`),
      statusLabel: this.i18n.t(`transactions.statuses.${tx.status}`),
      statusTone: STATUS_TONES[tx.status],
      amountLabel: formatSignedAmount(tx.amount, tx.type === 'credit' ? 'in' : 'out'),
      typeLabel: this.i18n.t(`transactions.types.${tx.type}`),
    })),
  );

  protected readonly summary = computed(() => {
    const total = this.store.total();
    if (total === null) return '';
    return this.i18n.t('transactions.summary', { loaded: this.store.items().length, total });
  });

  protected readonly searchText = linkedSignal(() => this.filters().q);
  protected readonly hasActiveFilters = computed(() => {
    const { q, type, status } = this.filters();
    return q !== '' || type !== null || status !== null;
  });
  protected readonly filterControls = computed(() => {
    const t = this.i18n.t;
    return [
      {
        key: 'type',
        label: t('transactions.type'),
        options: TRANSACTION_TYPES.map((v) => ({ value: v, label: t(`transactions.types.${v}`) })),
      },
      {
        key: 'status',
        label: t('transactions.status'),
        options: TRANSACTION_STATUSES.map((v) => ({
          value: v,
          label: t(`transactions.statuses.${v}`),
        })),
      },
    ] as const;
  });

  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  constructor() {
    // URL filters drive the feed: every distinct change restarts it from the top.
    this.filters$.pipe(takeUntilDestroyed()).subscribe((filters) => {
      this.store.load(filters);
      this.viewport()?.scrollToIndex(0);
    });

    // Prefetch near the end. Rendered-range changes cover both scrolling and a page arriving
    // while the user already sits at the bottom (no scroll event would fire then).
    toObservable(this.viewport)
      .pipe(
        switchMap((viewport) => (viewport ? viewport.renderedRangeStream : EMPTY)),
        filter((range) => range.end >= this.store.items().length - PREFETCH_ROWS),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.store.loadMore());

    toObservable(this.searchText)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((text) => text.trim()),
        distinctUntilChanged(),
        filter((q) => q !== this.filters().q),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.updateFilters({ q }));
  }

  protected trackById = (_: number, tx: Transaction) => tx.id;

  protected onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected onFilterChange(key: FilterKey, event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.updateFilters({ [key]: value } as Partial<TransactionFilters>);
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.updateFilters(DEFAULT_TRANSACTION_FILTERS);
  }

  private updateFilters(patch: Partial<TransactionFilters>): void {
    const next = { ...this.filters(), ...patch };
    void this.router.navigate([], {
      relativeTo: this.route,
      // Replace (not merge): the feed's only URL state is its filters.
      queryParams: toFilterParams(next),
    });
  }
}
