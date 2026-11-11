import { Component } from '@angular/core';

import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Temporary placeholder — admin-only route used to demonstrate role guards. */
@Component({
  selector: 'app-settings-page',
  imports: [TranslatePipe],
  template: `
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">
      {{ 'pages.settings' | t }}
    </h1>
    <p class="mt-1 text-slate-600 dark:text-slate-300">{{ 'settings.body' | t }}</p>
  `,
})
export class SettingsPage {}
