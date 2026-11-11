import {
  HttpErrorResponse,
  type HttpHandlerFn,
  type HttpInterceptorFn,
  type HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { AUTH_API, AuthService } from '../auth/auth.service';

/** Endpoints that must never carry a bearer token nor trigger a refresh loop. */
const PUBLIC_ENDPOINTS = [`${AUTH_API}/login`, `${AUTH_API}/refresh`];

const withBearer = (req: HttpRequest<unknown>, token: string | null) =>
  token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

/**
 * Attaches the access token to API calls. On a 401 it refreshes the session once
 * (concurrent requests share the same refresh) and replays the original request.
 * If the refresh fails, the user is logged out.
 */
export const authInterceptor: HttpInterceptorFn = (req, next: HttpHandlerFn) => {
  if (!req.url.startsWith('/api/') || PUBLIC_ENDPOINTS.some((url) => req.url.startsWith(url))) {
    return next(req);
  }

  const auth = inject(AuthService);

  return next(withBearer(req, auth.getAccessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        catchError((refreshError: unknown) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
        switchMap((token) => next(withBearer(req, token))),
      );
    }),
  );
};
