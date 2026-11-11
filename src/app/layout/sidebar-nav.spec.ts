import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { Role } from '../core/auth/auth.models';
import { AuthService } from '../core/auth/auth.service';
import { SidebarNav } from './sidebar-nav';

describe('SidebarNav', () => {
  const role = signal<Role | null>(null);

  const renderLabels = async (as: Role): Promise<string[]> => {
    role.set(as);
    const fixture = TestBed.createComponent(SidebarNav);
    await fixture.whenStable();
    const links = (fixture.nativeElement as HTMLElement).querySelectorAll('a');
    return Array.from(links, (a) => a.textContent?.trim() ?? '');
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { hasRole: (...roles: Role[]) => roles.includes(role() as Role) },
        },
      ],
    });
  });

  it.each<[Role, string[]]>([
    ['admin', ['Dashboard', 'Customers', 'Transactions', 'Settings']],
    ['analyst', ['Dashboard', 'Customers', 'Transactions']],
    ['viewer', ['Dashboard', 'Transactions']],
  ])('shows the %s navigation', async (as, expected) => {
    expect(await renderLabels(as)).toEqual(expected);
  });
});
