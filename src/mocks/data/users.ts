import type { Role, User } from '../../app/core/auth/auth.models';

export interface MockUserRecord extends User {
  password: string;
}

/** Shared password for every demo account — shown on the login page. */
export const DEMO_PASSWORD = 'Ledgerly#2026';

export const MOCK_USERS: readonly MockUserRecord[] = [
  {
    id: 'u-1001',
    name: 'Avery Collins',
    email: 'admin@ledgerly.dev',
    role: 'admin',
    password: DEMO_PASSWORD,
  },
  {
    id: 'u-1002',
    name: 'Jordan Reyes',
    email: 'analyst@ledgerly.dev',
    role: 'analyst',
    password: DEMO_PASSWORD,
  },
  {
    id: 'u-1003',
    name: 'Morgan Lee',
    email: 'viewer@ledgerly.dev',
    role: 'viewer',
    password: DEMO_PASSWORD,
  },
];

/** Strips the password before a user leaves the mock backend. */
export function toPublicUser({ id, name, email, role }: MockUserRecord): User {
  return { id, name, email, role };
}

export function findUserById(id: string): MockUserRecord | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

export const DEMO_ACCOUNTS: readonly { email: string; role: Role }[] = MOCK_USERS.map(
  ({ email, role }) => ({ email, role }),
);
