import { httpResource } from '@angular/common/http';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type Params, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, map } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { I18n } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/translate';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import type { Page } from '../../shared/models/page';
import { Badge, type BadgeTone } from '../../shared/ui/badge';
import { Icon, type IconName } from '../../shared/ui/icon';
import { Paginator } from '../../shared/ui/paginator';
import { countryName, formatDate, formatFull } from '../../shared/utils/format';
import {
  type CustomerQuery,
  type CustomerSortKey,
  DEFAULT_SORT_DIRECTION,
  PAGE_SIZES,
  parseCustomerQuery,
  toApiParams,
  toUrlParams,
} from './customer-query';
import {
  CUSTOMER_STATUSES,
  type Customer,
  type CustomerStatus,
  RISK_LEVELS,
  type RiskLevel,
  SEGMENTS,
} from './customers.models';

const SEARCH_DEBOUNCE_MS = 300;

const RISK_TONES: Record<RiskLevel, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
};
const STATUS_TONES: Record<CustomerStatus, BadgeTone> = {
  active: 'success',
  onboarding: 'info',
  suspended: 'neutral',
};
const SORT_LABELS: Record<CustomerSortKey, MessageKey> = {
  name: 'customers.customer',
  balance: 'customers.balance',
  lastActivity: 'customers.lastActivity',
};

type FilterKey = 'segment' | 'risk' | 'status';

@Component({
  selector: 'app-customers-page',
  imports: [Badge, Icon, Paginator, RouterLink, TranslatePipe],
  templateUrl: './customers-page.html',
})
export class CustomersPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18n);

  /** Analysts can browse customers; only admins onboard new ones (also enforced by route + API). */
  protected readonly canManage = computed(() => this.auth.user()?.role === 'admin');
  protected readonly columnCount = computed(() => (this.canManage() ? 8 : 7));

  /** The URL is the single source of truth for the list state. */
  private readonly queryParams = toSignal(this.route.queryParams, {
    initialValue: {} as Params,
  });
  protected readonly query = computed(() => parseCustomerQuery(this.queryParams()));

  private readonly customersResource = httpResource<Page<Customer>>(() => ({
    url: '/api/customers',
    params: toApiParams(this.query()),
  }));

  /** Last loaded page — kept on screen (dimmed) while the next one loads. */
  protected readonly result = linkedSignal<Page<Customer> | undefined, Page<Customer> | undefined>({
    source: () => (this.customersResource.hasValue() ? this.customersResource.value() : undefined),
    computation: (next, previous) => next ?? previous?.value,
  });
  protected readonly isRefreshing = computed(
    () => this.customersResource.isLoading() && this.result() !== undefined,
  );
  protected readonly hasError = computed(() => this.customersResource.error() !== undefined);

  protected readonly rows = computed(() =>
    (this.result()?.items ?? []).map((c) => ({
      ...c,
      segmentLabel: this.i18n.t(`customers.segments.${c.segment}`),
      countryLabel: countryName(c.country),
      riskLabel: this.i18n.t(`customers.risks.${c.risk}`),
      riskTone: RISK_TONES[c.risk],
      statusLabel: this.i18n.t(`customers.statuses.${c.status}`),
      statusTone: STATUS_TONES[c.status],
      balanceLabel: formatFull(c.balance, 'currency'),
      lastActivityLabel: formatDate(c.lastActivity),
    })),
  );

  /** Local echo of the search box; synced back from the URL on back/forward navigation. */
  protected readonly searchText = linkedSignal(() => this.query().q);

  protected readonly filters = computed(() => {
    const t = this.i18n.t;
    return [
      {
        key: 'segment',
        label: t('customers.segment'),
        options: SEGMENTS.map((v) => ({ value: v, label: t(`customers.segments.${v}`) })),
      },
      {
        key: 'risk',
        label: t('customers.risk'),
        options: RISK_LEVELS.map((v) => ({ value: v, label: t(`customers.risks.${v}`) })),
      },
      {
        key: 'status',
        label: t('customers.status'),
        options: CUSTOMER_STATUSES.map((v) => ({ value: v, label: t(`customers.statuses.${v}`) })),
      },
    ] as const;
  });

  protected readonly hasActiveFilters = computed(() => {
    const { q, segment, risk, status } = this.query();
    return q !== '' || segment !== null || risk !== null || status !== null;
  });

  protected readonly caption = computed(() => {
    const { sort, dir } = this.query();
    return this.i18n.t('customers.caption', {
      column: this.i18n.t(SORT_LABELS[sort]),
      direction: this.i18n.t(dir === 'asc' ? 'customers.ascending' : 'customers.descending'),
    });
  });

  protected readonly pageSizes = PAGE_SIZES;
  protected readonly skeletonRows = Array.from({ length: 8 }, (_, i) => i);

  constructor() {
    toObservable(this.searchText)
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((text) => text.trim()),
        distinctUntilChanged(),
        filter((q) => q !== this.query().q),
        takeUntilDestroyed(),
      )
      .subscribe((q) => this.update({ q }));
  }

  protected onSearchInput(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  protected onFilterChange(key: FilterKey, event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.update({ [key]: value } as Partial<CustomerQuery>);
  }

  protected clearFilters(): void {
    this.searchText.set('');
    this.update({ q: '', segment: null, risk: null, status: null });
  }

  protected sortBy(key: CustomerSortKey): void {
    const { sort, dir } = this.query();
    const nextDir = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : DEFAULT_SORT_DIRECTION[key];
    this.update({ sort: key, dir: nextDir });
  }

  protected ariaSort(key: CustomerSortKey): 'ascending' | 'descending' | null {
    const { sort, dir } = this.query();
    return sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : null;
  }

  protected sortIcon(key: CustomerSortKey): IconName {
    const { sort, dir } = this.query();
    return sort !== key ? 'arrowsUpDown' : dir === 'asc' ? 'chevronUp' : 'chevronDown';
  }

  protected goToPage(page: number): void {
    this.update({ page }, { resetPage: false });
  }

  protected setPageSize(pageSize: number): void {
    this.update({ pageSize: pageSize as CustomerQuery['pageSize'] });
  }

  protected retry(): void {
    this.customersResource.reload();
  }

  /** Writes the next query to the URL. Any change other than paging returns to page 1. */
  private update(patch: Partial<CustomerQuery>, { resetPage = true } = {}): void {
    const next: CustomerQuery = { ...this.query(), ...patch, ...(resetPage ? { page: 1 } : {}) };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toUrlParams(next),
      queryParamsHandling: 'merge',
    });
  }
}
