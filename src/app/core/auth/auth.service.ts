import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, firstValueFrom, map, type Observable, shareReplay, tap, throwError } from 'rxjs';

import type { AuthResponse, LoginRequest, RefreshRequest, Role, User } from './auth.models';
import { TokenStorage } from './token-storage';

export const AUTH_API = '/api/auth';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorage);

  private readonly currentUser = signal<User | null>(null);
  /** Kept in memory only — never persisted, so it can't be read from storage by injected scripts. */
  private accessToken: string | null = null;
  /** Shared in-flight refresh so concurrent 401s trigger a single refresh call. */
  private refreshInFlight$: Observable<string> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  getAccessToken(): string | null {
    return this.accessToken;
  }

  hasRole(...roles: Role[]): boolean {
    const user = this.currentUser();
    return user !== null && roles.includes(user.role);
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${AUTH_API}/login`, credentials).pipe(
      tap((response) => this.startSession(response)),
      map((response) => response.user),
    );
  }

  /** Exchanges the stored refresh token for a new session. Emits the new access token. */
  refresh(): Observable<string> {
    if (this.refreshInFlight$) return this.refreshInFlight$;

    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token available'));

    const body: RefreshRequest = { refreshToken };
    this.refreshInFlight$ = this.http.post<AuthResponse>(`${AUTH_API}/refresh`, body).pipe(
      tap((response) => this.startSession(response)),
      map((response) => response.accessToken),
      finalize(() => (this.refreshInFlight$ = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.refreshInFlight$;
  }

  /** Called on app start: silently restores the session from a stored refresh token. */
  async restoreSession(): Promise<void> {
    if (!this.storage.getRefreshToken()) return;
    try {
      await firstValueFrom(this.refresh());
    } catch {
      this.clearSession();
    }
  }

  logout(): void {
    this.clearSession();
    void this.router.navigateByUrl('/login');
  }

  private startSession({ accessToken, refreshToken, user }: AuthResponse): void {
    this.accessToken = accessToken;
    this.storage.setRefreshToken(refreshToken);
    this.currentUser.set(user);
  }

  private clearSession(): void {
    this.accessToken = null;
    this.storage.clear();
    this.currentUser.set(null);
  }
}
