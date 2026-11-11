import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  type CanActivateFn,
  provideRouter,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './auth.guards';
import type { Role } from './auth.models';
import { AuthService } from './auth.service';

class FakeAuthService {
  readonly role = signal<Role | null>(null);
  isAuthenticated = () => this.role() !== null;
  hasRole = (...roles: Role[]) => {
    const role = this.role();
    return role !== null && roles.includes(role);
  };
}

describe('auth guards', () => {
  let auth: FakeAuthService;

  const run = (guard: CanActivateFn, url = '/settings') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const redirectOf = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

  beforeEach(() => {
    auth = new FakeAuthService();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });

  describe('authGuard', () => {
    it('allows authenticated users', () => {
      auth.role.set('viewer');
      expect(run(authGuard)).toBe(true);
    });

    it('redirects guests to /login with the return URL', () => {
      expect(redirectOf(run(authGuard, '/settings'))).toBe('/login?returnUrl=%2Fsettings');
    });
  });

  describe('guestGuard', () => {
    it('allows guests', () => {
      expect(run(guestGuard)).toBe(true);
    });

    it('sends authenticated users home', () => {
      auth.role.set('admin');
      expect(redirectOf(run(guestGuard))).toBe('/');
    });
  });

  describe('roleGuard', () => {
    it.each<[Role, boolean]>([
      ['admin', true],
      ['analyst', true],
      ['viewer', false],
    ])('role %s → allowed: %s', (role, allowed) => {
      auth.role.set(role);
      const result = run(roleGuard('admin', 'analyst'));
      expect(allowed ? result : redirectOf(result)).toBe(allowed ? true : '/forbidden');
    });
  });
});
