import { Component, computed, input } from '@angular/core';
import type { FieldTree } from '@angular/forms/signals';

import { Icon } from '../ui/icon';

/**
 * Label + hint + error chrome around one projected control.
 * The control wires itself up through a template reference:
 *
 * ```html
 * <app-form-field #f label="Legal name" controlId="legal-name" [field]="form.name">
 *   <input id="legal-name" [formField]="form.name" class="ui-input"
 *          [attr.aria-describedby]="f.describedBy()" [attr.aria-invalid]="f.showError()" />
 * </app-form-field>
 * ```
 *
 * Errors appear once the field is touched (blur or a submit attempt), never while typing.
 */
@Component({
  selector: 'app-form-field',
  imports: [Icon],
  template: `
    <label [for]="controlId()" class="block text-sm font-medium text-slate-800 dark:text-slate-200">
      {{ label() }}
      @if (optional()) {
        <span class="font-normal text-slate-600 dark:text-slate-400">(optional)</span>
      }
    </label>
    @if (hint()) {
      <p [id]="hintId()" class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
        {{ hint() }}
      </p>
    }
    <div class="mt-1"><ng-content /></div>
    <!-- Always rendered so async status changes are announced. -->
    <p aria-live="polite" class="text-sm text-slate-600 empty:hidden dark:text-slate-400">
      @if (state().pending()) {
        {{ pendingLabel() }}
      }
    </p>
    @if (errorMessage(); as message) {
      <p
        [id]="errorId()"
        class="mt-1 flex items-start gap-1 text-sm text-red-700 dark:text-red-400"
      >
        <app-icon name="xCircle" class="mt-px size-4" />
        <span>{{ message }}</span>
      </p>
    }
  `,
  host: { class: 'block' },
})
export class FormFieldShell<T> {
  readonly field = input.required<FieldTree<T>>();
  readonly label = input.required<string>();
  /** Id of the projected control (for `<label for>`); also prefixes hint and error ids. */
  readonly controlId = input.required<string>();
  readonly hint = input<string>();
  readonly optional = input(false);
  readonly pendingLabel = input('Checking…');

  protected readonly state = computed(() => this.field()());
  protected readonly hintId = computed(() => `${this.controlId()}-hint`);
  protected readonly errorId = computed(() => `${this.controlId()}-error`);

  readonly showError = computed(() => {
    const state = this.state();
    return state.touched() && state.invalid();
  });

  protected readonly errorMessage = computed(() =>
    this.showError() ? (this.state().errors()[0]?.message ?? 'Enter a valid value.') : null,
  );

  readonly describedBy = computed(
    () =>
      [this.hint() ? this.hintId() : null, this.showError() ? this.errorId() : null]
        .filter(Boolean)
        .join(' ') || null,
  );
}
