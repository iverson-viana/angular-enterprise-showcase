import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Temporary placeholder — admin-only route used to demonstrate role guards. */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  template: `
    <main class="mx-auto max-w-3xl px-4 py-12">
      <h1 class="text-2xl font-semibold text-slate-900">Settings</h1>
      <p class="mt-1 text-slate-600">Only administrators can see this page.</p>
      <a routerLink="/" class="mt-6 inline-block text-blue-700 underline hover:text-blue-900">
        Back to dashboard
      </a>
    </main>
  `,
})
export class SettingsPage {}
