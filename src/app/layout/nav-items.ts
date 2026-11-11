import type { Role } from '../core/auth/auth.models';
import type { IconName } from '../shared/ui/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Roles allowed to see the item. Omit for every authenticated user. Mirrors the route guards. */
  roles?: readonly Role[];
  /** Match the URL exactly (needed for the root path). */
  exact?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: '/', icon: 'home', exact: true },
  { label: 'Customers', path: '/customers', icon: 'users', roles: ['admin', 'analyst'] },
  { label: 'Transactions', path: '/transactions', icon: 'transfers' },
  { label: 'Settings', path: '/settings', icon: 'settings', roles: ['admin'] },
];
