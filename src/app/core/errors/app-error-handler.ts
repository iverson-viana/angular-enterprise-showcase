import { ErrorHandler, inject, Injectable } from '@angular/core';

import { I18n } from '../i18n/i18n.service';
import { ToastService } from '../notifications/toast.service';

/**
 * Last line of defence for errors nothing else handled (also unhandled promise rejections,
 * via provideBrowserGlobalErrorListeners). Logs the details for developers and tells the
 * user once, instead of failing silently. A real app would also report to monitoring here.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly toasts = inject(ToastService);
  private readonly i18n = inject(I18n);

  handleError(error: unknown): void {
    console.error(error);
    this.toasts.show({
      key: 'unexpected-error',
      tone: 'error',
      message: this.i18n.t('errors.unexpected'),
    });
  }
}
