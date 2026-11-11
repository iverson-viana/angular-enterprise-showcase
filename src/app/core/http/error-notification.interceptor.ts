import { HttpContextToken, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

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

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !req.context.get(SILENT_HTTP_ERRORS)) {
        if (error.status === 0) {
          toasts.show({
            key: 'network-error',
            tone: 'error',
            message: "Can't reach the server. Check your connection and try again.",
          });
        } else if (error.status === 403) {
          toasts.show({
            key: 'forbidden',
            tone: 'warning',
            message: "You don't have permission to do that.",
          });
        }
      }
      return throwError(() => error);
    }),
  );
};
