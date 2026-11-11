import type { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { unsavedChangesGuard } from './core/navigation/unsaved-changes.guard';

/** Create and edit share one lazy chunk. */
const loadCustomerForm = () =>
  import('./features/customers/customer-form/customer-form-page').then((m) => m.CustomerFormPage);

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · Ledgerly',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        title: 'Dashboard · Ledgerly',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'customers/new',
        title: 'New customer · Ledgerly',
        canActivate: [roleGuard('admin')],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: loadCustomerForm,
      },
      {
        path: 'customers/:id/edit',
        title: 'Edit customer · Ledgerly',
        canActivate: [roleGuard('admin')],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: loadCustomerForm,
      },
      {
        path: 'customers',
        title: 'Customers · Ledgerly',
        canActivate: [roleGuard('admin', 'analyst')],
        loadComponent: () =>
          import('./features/customers/customers-page').then((m) => m.CustomersPage),
      },
      {
        path: 'transactions',
        title: 'Transactions · Ledgerly',
        loadComponent: () =>
          import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      {
        path: 'settings',
        title: 'Settings · Ledgerly',
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: 'forbidden',
        title: 'Access denied · Ledgerly',
        loadComponent: () =>
          import('./features/errors/forbidden-page').then((m) => m.ForbiddenPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
