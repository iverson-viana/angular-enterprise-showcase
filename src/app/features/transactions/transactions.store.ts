import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Service, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import type { CursorPage } from '../../shared/models/cursor-page';
import {
  DEFAULT_TRANSACTION_FILTERS,
  toFilterParams,
  type TransactionFilters,
  TRANSACTIONS_PAGE_LIMIT,
} from './transaction-query';
import type { Transaction } from './transactions.models';

interface FeedState {
  filters: TransactionFilters;
  items: readonly Transaction[];
  nextCursor: string | null;
  /** `null` until the first page arrives. */
  total: number | null;
  status: 'idle' | 'loading' | 'error';
}

const freshState = (filters: TransactionFilters): FeedState => ({
  filters,
  items: [],
  nextCursor: null,
  total: null,
  status: 'idle',
});

/**
 * Feature store for the infinite transactions feed: accumulates cursor pages into one list.
 * Provided by the page component (not root), so its state lives and dies with the page.
 */
@Service({ autoProvided: false })
export class TransactionsStore {
  private readonly http = inject(HttpClient);
  private readonly state = signal<FeedState>(freshState(DEFAULT_TRANSACTION_FILTERS));
  private inFlight: Subscription | null = null;

  readonly items = computed(() => this.state().items);
  readonly total = computed(() => this.state().total);
  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly hasError = computed(() => this.state().status === 'error');
  readonly hasMore = computed(
    () => this.state().total === null || this.state().nextCursor !== null,
  );
  /** Nothing to show yet: first page loading (or failed). */
  readonly isEmptyLoading = computed(() => this.isLoading() && this.items().length === 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.inFlight?.unsubscribe());
  }

  /** Starts a fresh feed for the given filters, cancelling any in-flight request. */
  load(filters: TransactionFilters): void {
    this.inFlight?.unsubscribe();
    this.state.set(freshState(filters));
    this.fetchNext();
  }

  /** Appends the next page. No-op while loading or once the feed is exhausted. Also retries. */
  loadMore(): void {
    if (this.isLoading() || !this.hasMore()) return;
    this.fetchNext();
  }

  private fetchNext(): void {
    const { filters, nextCursor } = this.state();
    this.state.update((s) => ({ ...s, status: 'loading' }));

    const params: Record<string, string> = {
      ...toFilterParams(filters),
      limit: String(TRANSACTIONS_PAGE_LIMIT),
      ...(nextCursor ? { cursor: nextCursor } : {}),
    };
    this.inFlight = this.http
      .get<CursorPage<Transaction>>('/api/transactions', { params })
      .subscribe({
        next: (page) =>
          this.state.update((s) => ({
            ...s,
            items: [...s.items, ...page.items],
            nextCursor: page.nextCursor,
            total: page.total,
            status: 'idle',
          })),
        error: () => this.state.update((s) => ({ ...s, status: 'error' })),
      });
  }
}
