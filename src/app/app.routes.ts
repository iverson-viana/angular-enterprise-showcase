import type { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { pageTitle } from './core/i18n/i18n-title.strategy';
import { unsavedChangesGuard } from './core/navigation/unsaved-changes.guard';

/** Create and edit share one lazy chunk. */
const loadCustomerForm = () =>
  import('./features/customers/customer-form/customer-form-page').then((m) => m.CustomerFormPage);

export const routes: Routes = [
  {
    path: 'login',
    title: pageTitle('pages.signIn'),
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
        title: pageTitle('pages.dashboard'),
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'customers/new',
        title: pageTitle('pages.newCustomer'),
        canActivate: [roleGuard('admin')],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: loadCustomerForm,
      },
      {
        path: 'customers/:id/edit',
        title: pageTitle('pages.editCustomer'),
        canActivate: [roleGuard('admin')],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: loadCustomerForm,
      },
      {
        path: 'customers',
        title: pageTitle('pages.customers'),
        canActivate: [roleGuard('admin', 'analyst')],
        loadComponent: () =>
          import('./features/customers/customers-page').then((m) => m.CustomersPage),
      },
      {
        path: 'transactions',
        title: pageTitle('pages.transactions'),
        loadComponent: () =>
          import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      {
        path: 'settings',
        title: pageTitle('pages.settings'),
        canActivate: [roleGuard('admin')],
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: 'forbidden',
        title: pageTitle('pages.forbidden'),
        loadComponent: () =>
          import('./features/errors/forbidden-page').then((m) => m.ForbiddenPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
