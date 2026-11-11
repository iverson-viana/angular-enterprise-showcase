import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { Component, computed, inject, output } from '@angular/core';

import { AuthService } from '../core/auth/auth.service';
import { ThemeService } from '../core/theme/theme.service';
import { Icon } from '../shared/ui/icon';

const ICON_BUTTON =
  'inline-flex size-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-blue-400';

@Component({
  selector: 'app-topbar',
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, Icon],
  template: `
    <header
      class="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8 dark:border-slate-800 dark:bg-slate-900/90"
    >
      <button
        type="button"
        class="${ICON_BUTTON} -ml-2 lg:hidden"
        aria-label="Open navigation"
        (click)="menuClick.emit()"
      >
        <app-icon name="menu" />
      </button>

      <div class="flex-1"></div>

      <button
        type="button"
        class="${ICON_BUTTON}"
        aria-label="Dark theme"
        [attr.aria-pressed]="theme.isDark()"
        (click)="theme.toggle()"
      >
        <app-icon [name]="theme.isDark() ? 'moon' : 'sun'" />
      </button>

      @if (auth.user(); as user) {
        <button
          type="button"
          [cdkMenuTriggerFor]="userMenu"
          class="flex items-center gap-2 rounded-md py-1 pr-2 pl-1 text-sm hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:outline-none dark:hover:bg-slate-800 dark:focus-visible:ring-blue-400"
        >
          <span
            aria-hidden="true"
            class="flex size-8 items-center justify-center rounded-full bg-blue-700 text-xs font-semibold text-white"
          >
            {{ initials() }}
          </span>
          <span class="hidden font-medium text-slate-800 sm:inline dark:text-slate-100">
            {{ user.name }}
          </span>
          <span class="sr-only sm:hidden">Account menu for {{ user.name }}</span>
          <app-icon name="chevronDown" class="size-4 text-slate-500 dark:text-slate-400" />
        </button>

        <ng-template #userMenu>
          <div
            cdkMenu
            class="mt-2 w-60 rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          >
            <div class="border-b border-slate-200 px-3 py-2 dark:border-slate-700" role="none">
              <p class="truncate text-sm font-medium text-slate-900 dark:text-white">
                {{ user.name }}
              </p>
              <p class="truncate text-sm text-slate-600 dark:text-slate-300">{{ user.email }}</p>
              <p class="mt-1 text-xs text-slate-600 capitalize dark:text-slate-300">
                Role: {{ user.role }}
              </p>
            </div>
            <button
              type="button"
              cdkMenuItem
              (cdkMenuItemTriggered)="auth.logout()"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
            >
              <app-icon name="logout" class="size-4" />
              Sign out
            </button>
          </div>
        </ng-template>
      }
    </header>
  `,
})
export class Topbar {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  readonly menuClick = output();

  protected readonly initials = computed(
    () =>
      this.auth
        .user()
        ?.name.split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() ?? '',
  );
}
