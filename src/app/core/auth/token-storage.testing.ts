import type { Provider } from '@angular/core';

import { TokenStorage } from './token-storage';

/** In-memory TokenStorage for unit tests — no dependency on the environment's Web Storage. */
export class InMemoryTokenStorage implements Pick<TokenStorage, keyof TokenStorage> {
  private refreshToken: string | null = null;

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  clear(): void {
    this.refreshToken = null;
  }
}

export const provideInMemoryTokenStorage = (): Provider => ({
  provide: TokenStorage,
  useClass: InMemoryTokenStorage,
});
