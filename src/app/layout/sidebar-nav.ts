import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { Icon } from '../shared/ui/icon';
import { NAV_ITEMS } from './nav-items';

/** Main navigation, filtered by the signed-in user's role. */
@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive, Icon, TranslatePipe],
  template: `
    <nav [attr.aria-label]="'shell.mainNav' | t">
      <ul class="space-y-1">
        @for (item of items(); track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-blue-50 text-blue-800 dark:bg-slate-800 dark:text-white"
              [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              ariaCurrentWhenActive="page"
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-blue-400"
            >
              <app-icon [name]="item.icon" />
              {{ item.labelKey | t }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class SidebarNav {
  private readonly auth = inject(AuthService);

  protected readonly items = computed(() =>
    NAV_ITEMS.filter((item) => !item.roles || this.auth.hasRole(...item.roles)),
  );
}
