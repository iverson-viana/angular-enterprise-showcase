import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
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
  EMPTY_MASK,
  emptyNewCustomer,
  emptySignatory,
  type FieldErrorsResponse,
  IBAN_EXAMPLES,
  IBAN_MASK,
  MAX_SIGNATORIES,
  MIN_MONTHLY_VOLUME,
  ONBOARDING_COUNTRIES,
  ROUTING_MASK,
  TAX_ID_RULES,
  toCreateRequest,
} from './new-customer.models';
import { newCustomerSchema } from './new-customer.schema';

export const CUSTOMERS_API = '/api/customers';

@Component({
  selector: 'app-new-customer-page',
  imports: [FormRoot, FormField, FormFieldShell, MaskedInput, AmountInput, Icon, RouterLink],
  templateUrl: './new-customer-page.html',
})
export class NewCustomerPage implements HasUnsavedChanges {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  protected readonly model = signal(emptyNewCustomer());
  protected readonly customerForm = form(this.model, newCustomerSchema, {
    name: 'new-customer',
    submission: {
      action: () => this.create(),
      onInvalid: () => this.revealErrorSummary(),
    },
  });

  protected readonly segmentOptions = SEGMENTS.map((value) => ({
    value,
    label: SEGMENT_LABELS[value],
  }));
  protected readonly countryOptions = ONBOARDING_COUNTRIES.map((value) => ({
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
    viewChild.required<ElementRef<HTMLButtonElement>>('addSignatoryButton');

  /** Unexpected server failure, shown inline above the actions. */
  protected readonly serverError = signal<string | null>(null);
  private saved = false;

  hasUnsavedChanges(): boolean {
    return !this.saved && this.customerForm().dirty();
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
    this.afterRender(() => this.addSignatoryButton().nativeElement.focus());
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

  private async create(): Promise<TreeValidationResult> {
    this.serverError.set(null);
    try {
      const customer = await firstValueFrom(
        this.http.post<Customer>(CUSTOMERS_API, toCreateRequest(this.model())),
      );
      this.saved = true;
      this.toasts.show({
        tone: 'success',
        message: `${customer.name} was created and is now in onboarding.`,
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
        this.serverError.set("We couldn't create the customer. Please try again.");
      }
      return null;
    }
  }

  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }
}
