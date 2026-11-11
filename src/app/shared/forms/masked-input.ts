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

import { applyMask, type InputMask } from './input-mask';

/**
 * Text input with a live mask. The bound field holds the clean value ("12ABC34501DE35");
 * the user sees and types the formatted one ("12.ABC.345/01DE-35").
 * Works with `[formField]` — Signal Forms binds value, disabled, invalid, touched and required.
 */
@Component({
  selector: 'app-masked-input',
  template: `
    <input
      #control
      type="text"
      class="ui-input font-mono tracking-wide"
      [id]="inputId()"
      [value]="display()"
      [disabled]="disabled()"
      [attr.name]="name() || null"
      [attr.inputmode]="inputMode()"
      [attr.autocomplete]="autocomplete()"
      [attr.placeholder]="placeholder() || null"
      [attr.aria-required]="required() || null"
      [attr.aria-invalid]="touched() && invalid()"
      [attr.aria-describedby]="describedBy()"
      (input)="onInput(control)"
      (blur)="touch.emit()"
    />
  `,
  host: { class: 'block' },
})
export class MaskedInput implements FormValueControl<string> {
  readonly value = model('');
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touched = input(false);
  readonly required = input(false);
  readonly name = input('');
  readonly touch = output();

  readonly mask = input.required<InputMask>();
  /** Id of the inner `<input>`, so an external `<label for>` can target it. */
  readonly inputId = input.required<string>();
  readonly describedBy = input<string | null>(null);
  readonly inputMode = input<'text' | 'numeric'>('text');
  readonly autocomplete = input('off');
  readonly placeholder = input('');

  /** Cleaning first makes the display robust to values set programmatically in any shape. */
  protected readonly display = computed(() => {
    const mask = this.mask();
    return mask.format(mask.clean(this.value()));
  });

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  protected onInput(element: HTMLInputElement): void {
    this.value.set(applyMask(element, this.mask()));
  }
}
