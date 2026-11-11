import type { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Ledgerly',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'forbidden',
    title: 'Access denied · Ledgerly',
    loadComponent: () => import('./features/errors/forbidden-page').then((m) => m.ForbiddenPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        title: 'Dashboard · Ledgerly',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'settings',
        title: 'Settings · Ledgerly',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
