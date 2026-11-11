import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, TranslatePipe],
  template: `
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">
      {{ 'pages.forbidden' | t }}
    </h1>
    <p class="mt-1 text-slate-600 dark:text-slate-300">
      {{ 'forbiddenPage.body' | t }}
    </p>
    <a
      routerLink="/"
      class="mt-6 inline-block text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {{ 'forbiddenPage.back' | t }}
    </a>
  `,
})
export class ForbiddenPage {}
