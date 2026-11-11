import { expect, test, waitForIdle } from './fixtures';

test.describe('language', () => {
  test('switches to Portuguese in place and remembers it', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /^Language: EN/ }).click();
    await page.getByRole('menuitemradio', { name: 'Português (Brasil)' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar no Ledgerly');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
    await expect(page).toHaveTitle('Entrar · Ledgerly');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrar no Ledgerly');
  });
});

test.describe('accessibility (axe, WCAG 2.2 AA)', () => {
  test('sign-in page', async ({ page, expectAccessible }) => {
    await page.goto('/login');
    await expectAccessible();
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`main pages in ${theme} mode`, async ({ page, signInAs, expectAccessible }) => {
      await page.addInitScript((t) => localStorage.setItem('ledgerly.theme', t), theme);
      await signInAs('admin');

      for (const path of ['/', '/customers', '/transactions']) {
        await page.goto(path);
        await waitForIdle(page);
        await expectAccessible();
      }
    });
  }

  test('customer form with errors showing', async ({ page, signInAs, expectAccessible }) => {
    await signInAs('admin');
    await page.goto('/customers/new');
    await page.getByRole('button', { name: 'Create customer' }).click();
    await expect(page.getByRole('region', { name: /problems with this form/ })).toBeFocused();
    await expectAccessible();
  });

  test('mobile navigation drawer is a modal dialog that hands focus back', async ({
    page,
    signInAs,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAs('analyst');

    await page.getByRole('button', { name: 'Open navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Navigation' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await page.getByRole('button', { name: 'Open navigation' }).click();
    await drawer.getByRole('link', { name: 'Transactions' }).click();
    await expect(drawer).toBeHidden();
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
