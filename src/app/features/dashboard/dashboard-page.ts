import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/** Temporary placeholder — replaced by the real dashboard once the layout shell lands. */
@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <main class="mx-auto max-w-3xl px-4 py-12">
      @if (auth.user(); as user) {
        <h1 class="text-2xl font-semibold text-slate-900">Welcome, {{ user.name }}</h1>
        <p class="mt-1 text-slate-600">
          Signed in as <span class="font-medium text-slate-800">{{ user.role }}</span>
        </p>
      }
      <nav class="mt-6 flex gap-4" aria-label="Temporary">
        <a routerLink="/settings" class="text-blue-700 underline hover:text-blue-900">
          Settings (admin only)
        </a>
        <button
          type="button"
          (click)="auth.logout()"
          class="text-blue-700 underline hover:text-blue-900"
        >
          Sign out
        </button>
      </nav>
    </main>
  `,
})
export class DashboardPage {
  protected readonly auth = inject(AuthService);
}
