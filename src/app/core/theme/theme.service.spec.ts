import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const html = document.documentElement;

  beforeEach(() => html.classList.remove('dark'));

  it('applies and removes the dark class on <html> when toggled', () => {
    const theme = TestBed.inject(ThemeService);
    theme.setPreference('light');
    TestBed.tick();
    expect(html.classList.contains('dark')).toBe(false);

    theme.toggle();
    TestBed.tick();
    expect(theme.isDark()).toBe(true);
    expect(html.classList.contains('dark')).toBe(true);

    theme.toggle();
    TestBed.tick();
    expect(html.classList.contains('dark')).toBe(false);
  });

  it('follows the explicit preference', () => {
    const theme = TestBed.inject(ThemeService);
    theme.setPreference('dark');
    expect(theme.isDark()).toBe(true);
    theme.setPreference('light');
    expect(theme.isDark()).toBe(false);
  });
});
