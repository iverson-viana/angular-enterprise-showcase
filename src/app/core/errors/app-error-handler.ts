import { ErrorHandler, inject, Injectable } from '@angular/core';

import { ToastService } from '../notifications/toast.service';

/**
 * Last line of defence for errors nothing else handled (also unhandled promise rejections,
 * via provideBrowserGlobalErrorListeners). Logs the details for developers and tells the
 * user once, instead of failing silently. A real app would also report to monitoring here.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  private readonly toasts = inject(ToastService);

  handleError(error: unknown): void {
    console.error(error);
    this.toasts.show({
      key: 'unexpected-error',
      tone: 'error',
      message: 'Something went wrong. If the problem continues, reload the page.',
    });
  }
}
