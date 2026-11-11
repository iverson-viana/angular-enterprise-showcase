import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Service, signal } from '@angular/core';

export type ThemePreference = 'light' | 'dark' | 'system';

/** Keep in sync with the pre-paint script in index.html. */
export const THEME_STORAGE_KEY = 'ledgerly.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Light/dark theme as signals. Defaults to the OS preference until the user picks one,
 * then persists the choice. Applies the `dark` class on <html> (Tailwind class variant).
 */
@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly mediaQuery = this.document.defaultView?.matchMedia?.(DARK_QUERY) ?? null;

  private readonly systemPrefersDark = signal(this.mediaQuery?.matches ?? false);
  readonly preference = signal<ThemePreference>(this.readStoredPreference());
  readonly isDark = computed(() => {
    const preference = this.preference();
    return preference === 'system' ? this.systemPrefersDark() : preference === 'dark';
  });

  constructor() {
    const onSystemChange = (event: MediaQueryListEvent) =>
      this.systemPrefersDark.set(event.matches);
    this.mediaQuery?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() =>
      this.mediaQuery?.removeEventListener('change', onSystemChange),
    );

    effect(() => this.document.documentElement.classList.toggle('dark', this.isDark()));
  }

  toggle(): void {
    this.setPreference(this.isDark() ? 'light' : 'dark');
  }

  setPreference(preference: ThemePreference): void {
    this.preference.set(preference);
    try {
      if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Storage unavailable — preference lasts for this session only.
    }
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      return 'system';
    }
  }
}
