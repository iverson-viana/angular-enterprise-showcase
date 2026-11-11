import {
  Component,
  computed,
  type ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';

import { applyMask, integerMask } from './input-mask';

const MASK = integerMask();

/**
 * Whole-number money input: the field holds a `number | null`, the user sees "1,250,000".
 * The currency is shown as a visual prefix and announced through `aria-describedby` hints.
 */
@Component({
  selector: 'app-amount-input',
  template: `
    <div class="relative">
      <span
        aria-hidden="true"
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-600 dark:text-slate-400"
        >{{ currency() }}</span
      >
      <input
        #control
        type="text"
        inputmode="numeric"
        autocomplete="off"
        class="ui-input pl-12 text-right tabular-nums"
        [id]="inputId()"
        [value]="display()"
        [disabled]="disabled()"
        [attr.name]="name() || null"
        [attr.aria-required]="required() || null"
        [attr.aria-invalid]="touched() && invalid()"
        [attr.aria-describedby]="describedBy()"
        (input)="onInput(control)"
        (blur)="touch.emit()"
      />
    </div>
  `,
  host: { class: 'block' },
})
export class AmountInput implements FormValueControl<number | null> {
  readonly value = model<number | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output();

  readonly inputId = input.required<string>();
  readonly describedBy = input<string | null>(null);
  readonly currency = input('USD');

  protected readonly display = computed(() => {
    const value = this.value();
    return value === null ? '' : MASK.format(String(Math.trunc(value)));
  });

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  protected onInput(element: HTMLInputElement): void {
    const clean = applyMask(element, MASK);
    this.value.set(clean === '' ? null : Number(clean));
  }
}
