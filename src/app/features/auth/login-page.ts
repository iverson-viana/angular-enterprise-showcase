import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../../mocks/data/users';
import type { LoginRequest } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

/** Only same-app absolute paths are allowed, to prevent open redirects via ?returnUrl=. */
const safeRedirect = (url: string | undefined): string =>
  url?.startsWith('/') && !url.startsWith('//') ? url : '/';

@Component({
  selector: 'app-login-page',
  imports: [FormField],
  templateUrl: './login-page.html',
  host: { class: 'flex min-h-dvh items-center justify-center px-4 py-12' },
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from the `?returnUrl=` query param (withComponentInputBinding). */
  readonly returnUrl = input<string>();

  protected readonly demoAccounts = DEMO_ACCOUNTS;
  protected readonly serverError = signal<string | null>(null);

  protected readonly credentials = signal<LoginRequest>({ email: '', password: '' });
  protected readonly loginForm = form(this.credentials, (path) => {
    required(path.email, { message: 'Email is required.' });
    email(path.email, { message: 'Enter a valid email address.' });
    required(path.password, { message: 'Password is required.' });
  });

  protected useDemoAccount(accountEmail: string): void {
    this.serverError.set(null);
    this.credentials.set({ email: accountEmail, password: DEMO_PASSWORD });
  }

  protected async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    this.serverError.set(null);

    await submit(this.loginForm, async () => {
      try {
        await firstValueFrom(this.auth.login(this.credentials()));
        await this.router.navigateByUrl(safeRedirect(this.returnUrl()));
      } catch (error) {
        this.serverError.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? 'Invalid email or password.'
            : 'Something went wrong. Please try again.',
        );
      }
      return undefined;
    });
  }
}
