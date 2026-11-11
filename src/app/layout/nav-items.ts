import type { Role } from '../core/auth/auth.models';
import type { MessageKey } from '../core/i18n/translate';
import type { IconName } from '../shared/ui/icon';

export interface NavItem {
  labelKey: MessageKey;
  path: string;
  icon: IconName;
  /** Roles allowed to see the item. Omit for every authenticated user. Mirrors the route guards. */
  roles?: readonly Role[];
  /** Match the URL exactly (needed for the root path). */
  exact?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'pages.dashboard', path: '/', icon: 'home', exact: true },
  {
    labelKey: 'pages.customers',
    path: '/customers',
    icon: 'users',
    roles: ['admin', 'analyst'],
  },
  { labelKey: 'pages.transactions', path: '/transactions', icon: 'transfers' },
  { labelKey: 'pages.settings', path: '/settings', icon: 'settings', roles: ['admin'] },
];
