import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { AuthResponse } from '../auth/auth.models';
import { AUTH_API, AuthService } from '../auth/auth.service';
import { TokenStorage } from '../auth/token-storage';
import { provideInMemoryTokenStorage } from '../auth/token-storage.testing';
import { ToastService } from '../notifications/toast.service';
import { authInterceptor } from './auth.interceptor';

const session = (suffix: string): AuthResponse => ({
  accessToken: `access-${suffix}`,
  refreshToken: `refresh-${suffix}`,
  user: { id: 'u-1', name: 'Test User', email: 'test@ledgerly.dev', role: 'admin' },
});
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let auth: AuthService;

  /** Logs in through the real service so the interceptor sees a live session. */
  async function signIn(): Promise<void> {
    const done = firstValueFrom(auth.login({ email: 'a@b.dev', password: 'x' }));
    http.expectOne(`${AUTH_API}/login`).flush(session('1'));
    await done;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideInMemoryTokenStorage(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  it('does not attach a token to the login endpoint', async () => {
    await signIn();
    void firstValueFrom(auth.login({ email: 'a@b.dev', password: 'x' }));
    const req = http.expectOne(`${AUTH_API}/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(session('1'));
  });

  it('does not touch non-API requests', async () => {
    await signIn();
    void firstValueFrom(client.get('/assets/i18n/en.json'));
    const req = http.expectOne('/assets/i18n/en.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('attaches the bearer token to API requests', async () => {
    await signIn();
    void firstValueFrom(client.get('/api/customers'));
    const req = http.expectOne('/api/customers');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush([]);
  });

  it('refreshes once on 401 and replays the request with the new token', async () => {
    await signIn();
    const result = firstValueFrom(client.get<string[]>('/api/customers'));

    http.expectOne('/api/customers').flush(null, UNAUTHORIZED);
    http.expectOne(`${AUTH_API}/refresh`).flush(session('2'));

    const retry = http.expectOne('/api/customers');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-2');
    retry.flush(['ok']);

    expect(await result).toEqual(['ok']);
  });

  it('uses a single refresh for concurrent 401s', async () => {
    await signIn();
    const a = firstValueFrom(client.get('/api/customers'));
    const b = firstValueFrom(client.get('/api/transactions'));

    http.expectOne('/api/customers').flush(null, UNAUTHORIZED);
    http.expectOne('/api/transactions').flush(null, UNAUTHORIZED);
    http.expectOne(`${AUTH_API}/refresh`).flush(session('2'));

    http.expectOne('/api/customers').flush('a');
    http.expectOne('/api/transactions').flush('b');

    expect(await a).toBe('a');
    expect(await b).toBe('b');
  });

  it('logs out and explains why when the refresh fails', async () => {
    await signIn();
    const result = firstValueFrom(client.get('/api/customers'));

    http.expectOne('/api/customers').flush(null, UNAUTHORIZED);
    http.expectOne(`${AUTH_API}/refresh`).flush(null, UNAUTHORIZED);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(TokenStorage).getRefreshToken()).toBeNull();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/login');
    expect(TestBed.inject(ToastService).toasts()).toMatchObject([
      { key: 'session-expired', tone: 'warning' },
    ]);
  });

  it('passes through non-401 errors untouched', async () => {
    await signIn();
    const result = firstValueFrom(client.get('/api/customers'));
    http.expectOne('/api/customers').flush(null, { status: 500, statusText: 'Server Error' });

    await expect(result).rejects.toMatchObject({ status: 500 });
    expect(auth.isAuthenticated()).toBe(true);
  });
});
