import { Service } from '@angular/core';

const REFRESH_TOKEN_KEY = 'ledgerly.refreshToken';

/**
 * Persists only the refresh token so a session survives page reloads.
 * The access token is intentionally kept in memory (see AuthService).
 * Storage access is guarded: it can throw in private mode or when blocked.
 */
@Service()
export class TokenStorage {
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // Storage unavailable — session will simply not survive a reload.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Nothing to clear.
    }
  }
}
