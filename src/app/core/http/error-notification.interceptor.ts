import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { I18n } from '../i18n/i18n.service';
import { ToastService } from '../notifications/toast.service';

/** Set on a request to suppress global error toasts for it. */
export const SILENT_HTTP_ERRORS = new HttpContextToken<boolean>(() => false);

/**
 * Global toasts for HTTP failures a page can't explain by itself:
 * - status 0 → network unreachable;
 * - 403 → the user's role can't do this.
 * Other errors (4xx/5xx) are left to the page, which shows them inline — no double reporting.
 * The error is always re-thrown so callers still handle it.
 */
export const errorNotificationInterceptor: HttpInterceptorFn = (req, next) => {
  const toasts = inject(ToastService);
  const i18n = inject(I18n);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !req.context.get(SILENT_HTTP_ERRORS)) {
        if (error.status === 0) {
          toasts.show({
            key: 'network-error',
            tone: 'error',
            message: i18n.t('errors.network'),
          });
        } else if (error.status === 403) {
          toasts.show({
            key: 'forbidden',
            tone: 'warning',
            message: i18n.t('errors.forbidden'),
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
