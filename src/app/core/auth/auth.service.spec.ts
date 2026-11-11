import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { AuthResponse } from './auth.models';
import { AUTH_API, AuthService } from './auth.service';
import { TokenStorage } from './token-storage';
import { provideInMemoryTokenStorage } from './token-storage.testing';

const session = (suffix = '1'): AuthResponse => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  user: { id: 'u-1', name: 'Test User', email: 'test@ledgerly.dev', role: 'analyst' },
});

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let storage: TokenStorage;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideInMemoryTokenStorage(),
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    storage = TestBed.inject(TokenStorage);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('starts a session on login', async () => {
    const result = firstValueFrom(service.login({ email: 'a@b.dev', password: 'x' }));
    http.expectOne(`${AUTH_API}/login`).flush(session());

    expect((await result).role).toBe('analyst');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.getAccessToken()).toBe('access-1');
    expect(storage.getRefreshToken()).toBe('refresh-1');
  });

  it('checks roles', async () => {
    const result = firstValueFrom(service.login({ email: 'a@b.dev', password: 'x' }));
    http.expectOne(`${AUTH_API}/login`).flush(session());
    await result;

    expect(service.hasRole('analyst')).toBe(true);
    expect(service.hasRole('admin', 'viewer')).toBe(false);
  });

  it('shares a single in-flight refresh between concurrent callers', async () => {
    storage.setRefreshToken('refresh-0');
    const first = firstValueFrom(service.refresh());
    const second = firstValueFrom(service.refresh());

    const req = http.expectOne(`${AUTH_API}/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'refresh-0' });
    req.flush(session('2'));

    expect(await first).toBe('access-2');
    expect(await second).toBe('access-2');
    expect(storage.getRefreshToken()).toBe('refresh-2');
  });

  it('fails refresh immediately without a stored refresh token', async () => {
    await expect(firstValueFrom(service.refresh())).rejects.toThrow('No refresh token');
  });

  it('restores the session from a stored refresh token', async () => {
    storage.setRefreshToken('refresh-0');
    const restored = service.restoreSession();
    http.expectOne(`${AUTH_API}/refresh`).flush(session('3'));
    await restored;

    expect(service.user()?.name).toBe('Test User');
  });

  it('clears the session when restore fails', async () => {
    storage.setRefreshToken('expired');
    const restored = service.restoreSession();
    http.expectOne(`${AUTH_API}/refresh`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await restored;

    expect(service.isAuthenticated()).toBe(false);
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('clears everything and goes to /login on logout', async () => {
    const result = firstValueFrom(service.login({ email: 'a@b.dev', password: 'x' }));
    http.expectOne(`${AUTH_API}/login`).flush(session());
    await result;

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(service.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
