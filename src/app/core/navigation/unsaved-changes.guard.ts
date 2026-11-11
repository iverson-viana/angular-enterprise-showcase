import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

/** Implemented by pages that hold user input which a navigation would discard. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Leave this page and discard them?';

/** Asks before leaving a page with unsaved input (the native dialog is accessible by default). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const window = inject(DOCUMENT).defaultView;
  return window?.confirm(UNSAVED_CHANGES_MESSAGE) ?? true;
};
