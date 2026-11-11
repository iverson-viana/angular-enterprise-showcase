import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { AppErrorHandler } from './core/errors/app-error-handler';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorNotificationInterceptor } from './core/http/error-notification.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: AppErrorHandler },
    provideHttpClient(
      withFetch(),
      // Order matters: the first is outermost. Error toasts must see the final outcome,
      // i.e. after the auth interceptor has already tried a token refresh.
      withInterceptors([errorNotificationInterceptor, authInterceptor]),
    ),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
