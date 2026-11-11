import { Component } from '@angular/core';

/** Temporary placeholder — admin-only route used to demonstrate role guards. */
@Component({
  selector: 'app-settings-page',
  template: `
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Settings</h1>
    <p class="mt-1 text-slate-600 dark:text-slate-300">Only administrators can see this page.</p>
  `,
})
export class SettingsPage {}
