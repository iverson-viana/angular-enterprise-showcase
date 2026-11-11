import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test as base } from '@playwright/test';

export type Role = 'admin' | 'analyst' | 'viewer';
export const DEMO_PASSWORD = 'Ledgerly#2026';

/** WCAG 2.2 A + AA — the bar set for the project. */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface Fixtures {
  /** Signs in through the real form (the session is in-memory + refresh token, like production). */
  signInAs: (role: Role) => Promise<void>;
  /** Fails with a readable list of axe violations for the current page state. */
  expectAccessible: () => Promise<void>;
}

export const test = base.extend<Fixtures>({
  signInAs: async ({ page }, use) => {
    await use(async (role) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(`${role}@ledgerly.dev`);
      await page.getByLabel('Password').fill(DEMO_PASSWORD);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
    });
  },

  expectAccessible: async ({ page }, use) => {
    await use(async () => {
      const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      const summary = results.violations.map(
        (v) =>
          `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
      expect(summary, 'axe violations').toEqual([]);
    });
  },
});

export { expect };

/**
 * Waits for the page to be rendered and its data loaded: a heading exists (the app has
 * booted — before that, "no busy region" is trivially true), and no busy region or
 * skeleton placeholder is left.
 */
export async function waitForIdle(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.locator('[class*="animate-pulse"]')).toHaveCount(0);
}
