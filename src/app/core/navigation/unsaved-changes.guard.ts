import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';

import { I18n } from '../i18n/i18n.service';

/** Implemented by pages that hold user input which a navigation would discard. */
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving a page with unsaved input (the native dialog is accessible by default). */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const window = inject(DOCUMENT).defaultView;
  return window?.confirm(inject(I18n).t('common.unsavedChanges')) ?? true;
};
