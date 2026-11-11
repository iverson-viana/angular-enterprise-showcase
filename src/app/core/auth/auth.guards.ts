import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import type { Role } from './auth.models';
import { AuthService } from './auth.service';

/** Allows authenticated users; otherwise redirects to /login preserving the target URL. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in users away from guest-only pages such as /login. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;

/** Allows only the given roles; authenticated users without them land on /forbidden. */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  () =>
    inject(AuthService).hasRole(...roles) ? true : inject(Router).createUrlTree(['/forbidden']);
