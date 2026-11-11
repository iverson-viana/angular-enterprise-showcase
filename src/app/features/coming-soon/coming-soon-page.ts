import { Component, input } from '@angular/core';

/** Placeholder for features not built yet. `heading` comes from the route's `data`. */
@Component({
  selector: 'app-coming-soon-page',
  template: `
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">{{ heading() }}</h1>
    <p class="mt-1 text-slate-600 dark:text-slate-300">This section is under construction.</p>
  `,
})
export class ComingSoonPage {
  readonly heading = input.required<string>();
}
