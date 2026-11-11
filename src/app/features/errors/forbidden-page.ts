import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Access denied</h1>
    <p class="mt-1 text-slate-600 dark:text-slate-300">
      Your role doesn't have permission to view this page.
    </p>
    <a
      routerLink="/"
      class="mt-6 inline-block text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
    >
      Back to dashboard
    </a>
  `,
})
export class ForbiddenPage {}
