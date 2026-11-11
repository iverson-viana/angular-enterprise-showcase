import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  type TreeValidationResult,
  type ValidationError,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { HasUnsavedChanges } from '../../../core/navigation/unsaved-changes.guard';
import { ToastService } from '../../../core/notifications/toast.service';
import { AmountInput } from '../../../shared/forms/amount-input';
import { FormFieldShell } from '../../../shared/forms/form-field-shell';
import { MaskedInput } from '../../../shared/forms/masked-input';
import { Icon } from '../../../shared/ui/icon';
import { countryName, formatFull } from '../../../shared/utils/format';
import { type Customer, SEGMENT_LABELS, SEGMENTS } from '../customers.models';
import {
  ACCOUNT_MASK,
  CREDIT_TO_VOLUME_RATIO,
  CUSTOMER_COUNTRIES,
  type CustomerDetails,
  type CustomerDraft,
  EMPTY_MASK,
  emptyCustomerDraft,
  emptySignatory,
  type FieldErrorsResponse,
  IBAN_EXAMPLES,
  IBAN_MASK,
  MAX_SIGNATORIES,
  MIN_MONTHLY_VOLUME,
  ROUTING_MASK,
  TAX_ID_RULES,
  toCustomerInput,
  toDraft,
} from './customer-form.models';
import { customerFormSchema } from './customer-form.schema';

export const CUSTOMERS_API = '/api/customers';

/**
 * Create (`/customers/new`) and edit (`/customers/:id/edit`) share this page: same fields,
 * same rules. In edit mode the saved data is loaded first and the saved name is exempt
 * from the availability check.
 */
@Component({
  selector: 'app-customer-form-page',
  imports: [FormRoot, FormField, FormFieldShell, MaskedInput, AmountInput, Icon, RouterLink],
  templateUrl: './customer-form-page.html',
})
export class CustomerFormPage implements HasUnsavedChanges {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  /** Route param (withComponentInputBinding); absent when creating. */
  readonly id = input<string>();
  protected readonly isEdit = computed(() => this.id() !== undefined);

  private readonly detailsResource = httpResource<CustomerDetails>(() => {
    const id = this.id();
    return id ? `${CUSTOMERS_API}/${encodeURIComponent(id)}` : undefined;
  });
  protected readonly details = computed(() =>
    this.detailsResource.hasValue() ? this.detailsResource.value() : undefined,
  );
  protected readonly loadFailed = computed(() => this.detailsResource.error() !== undefined);
  protected readonly notFound = computed(() => {
    const error = this.detailsResource.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });

  /** Empty when creating; replaced by the saved data once it loads — and freely editable. */
  protected readonly model = linkedSignal<CustomerDraft>(() => {
    const details = this.details();
    return details ? toDraft(details) : emptyCustomerDraft();
  });
  protected readonly customerForm = form(
    this.model,
    customerFormSchema({
      customerId: () => this.id(),
      originalLegalName: () => this.details()?.legalName,
    }),
    {
      name: 'customer',
      submission: {
        action: () => this.save(),
        onInvalid: () => this.revealErrorSummary(),
      },
    },
  );

  protected readonly segmentOptions = SEGMENTS.map((value) => ({
    value,
    label: SEGMENT_LABELS[value],
  }));
  protected readonly countryOptions = CUSTOMER_COUNTRIES.map((value) => ({
    value,
    label: countryName(value),
  }));
  protected readonly ibanMask = IBAN_MASK;
  protected readonly routingMask = ROUTING_MASK;
  protected readonly accountMask = ACCOUNT_MASK;
  protected readonly maxSignatories = MAX_SIGNATORIES;

  protected readonly taxIdRule = computed(() => {
    const country = this.model().company.country;
    return country === '' ? null : TAX_ID_RULES[country];
  });
  protected readonly taxIdMask = computed(() => this.taxIdRule()?.mask ?? EMPTY_MASK);
  protected readonly taxIdHint = computed(() => {
    const rule = this.taxIdRule();
    return rule ? `For example ${rule.example}.` : 'Choose a country first.';
  });
  protected readonly ibanHint = computed(() => {
    const country = this.model().company.country;
    const example = country === '' || country === 'US' ? IBAN_EXAMPLES.GB : IBAN_EXAMPLES[country];
    return `For example ${IBAN_MASK.format(example)}.`;
  });
  protected readonly volumeHint = `At least ${formatFull(MIN_MONTHLY_VOLUME, 'currency')}.`;
  protected readonly creditHint = computed(() => {
    const volume = this.model().banking.monthlyVolume;
    return volume
      ? `Up to ${formatFull(volume * CREDIT_TO_VOLUME_RATIO, 'currency')} (${CREDIT_TO_VOLUME_RATIO}× monthly volume).`
      : `Up to ${CREDIT_TO_VOLUME_RATIO}× the monthly volume.`;
  });

  /** Shown after a failed submit attempt; disappears as soon as every error is fixed. */
  private readonly summaryRequested = signal(false);
  protected readonly summaryItems = computed(() =>
    this.summaryRequested()
      ? this.customerForm()
          .errorSummary()
          .map((error) => ({ error, text: this.describeError(error) }))
      : [],
  );
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');
  private readonly addSignatoryButton =
    viewChild<ElementRef<HTMLButtonElement>>('addSignatoryButton');

  /** Unexpected server failure, shown inline above the actions. */
  protected readonly serverError = signal<string | null>(null);
  private saved = false;

  hasUnsavedChanges(): boolean {
    return !this.saved && this.customerForm().dirty();
  }

  protected retryLoad(): void {
    this.detailsResource.reload();
  }

  /** A tax ID typed for one country is meaningless for another: start over. */
  protected onCountryChange(): void {
    this.customerForm.company.taxId().reset('');
  }

  protected addSignatory(): void {
    const index = this.model().signatories.length;
    this.model.update((m) => ({ ...m, signatories: [...m.signatories, emptySignatory()] }));
    this.afterRender(() => this.document.getElementById(`signatory-${index}-name`)?.focus());
  }

  protected removeSignatory(index: number): void {
    this.model.update((m) => ({
      ...m,
      signatories: m.signatories.filter((_, i) => i !== index),
    }));
    // The removed row took focus with it; land somewhere predictable.
    this.afterRender(() => this.addSignatoryButton()?.nativeElement.focus());
  }

  protected focusField(error: ValidationError.WithFieldTree): void {
    error.fieldTree().focusBoundControl();
  }

  private describeError(error: ValidationError.WithFieldTree): string {
    const message = error.message ?? 'Enter a valid value.';
    const index = [...this.customerForm.signatories].findIndex(
      (s) => s.name === error.fieldTree || s.email === error.fieldTree,
    );
    return index === -1 ? message : `Signatory ${index + 1}: ${message}`;
  }

  private revealErrorSummary(): void {
    this.summaryRequested.set(true);
    this.afterRender(() => this.summary()?.nativeElement.focus());
  }

  private async save(): Promise<TreeValidationResult> {
    this.serverError.set(null);
    const id = this.id();
    const body = toCustomerInput(this.model());
    try {
      const customer = await firstValueFrom(
        id
          ? this.http.put<Customer>(`${CUSTOMERS_API}/${encodeURIComponent(id)}`, body)
          : this.http.post<Customer>(CUSTOMERS_API, body),
      );
      this.saved = true;
      this.toasts.show({
        tone: 'success',
        message: id
          ? `${customer.name} was updated.`
          : `${customer.name} was created and is now in onboarding.`,
      });
      await this.router.navigate(['/customers'], { queryParams: { q: customer.id } });
      return null;
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;

      const legalNameError = (error.error as FieldErrorsResponse | null)?.fieldErrors?.legalName;
      if (error.status === 409 && legalNameError) {
        this.revealErrorSummary();
        return {
          kind: 'server',
          message: legalNameError,
          fieldTree: this.customerForm.company.legalName,
        };
      }
      // Network (0) and permission (403) failures are already announced by a global toast.
      if (error.status !== 0 && error.status !== 403) {
        this.serverError.set("We couldn't save the customer. Please try again.");
      }
      return null;
    }
  }

  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }
}
