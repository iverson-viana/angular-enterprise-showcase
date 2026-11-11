import { DEMO_PASSWORD, expect, test } from './fixtures';

test.describe('authentication', () => {
  test('sends anonymous users to sign in, then back to the page they asked for', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Ftransactions$/);

    await page.getByLabel('Email').fill('analyst@ledgerly.dev');
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { level: 1, name: 'Transactions' })).toBeVisible();
  });

  test('rejects wrong credentials with an announced error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@ledgerly.dev');
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText('Invalid email or password.');
    await expect(page).toHaveURL('/login');
  });

  test('restores the session after a reload (refresh token)', async ({ page, signInAs }) => {
    await signInAs('admin');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  });

  test('signs out and confirms it', async ({ page, signInAs }) => {
    await signInAs('admin');
    await page.getByRole('button', { name: /Avery Collins/ }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("You've been signed out.")).toBeVisible();
    // The session is really gone: protected pages bounce back to sign in.
    await page.goto('/customers');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('role-based access', () => {
  test('viewers never see customers — not in the menu, not by URL', async ({ page, signInAs }) => {
    await signInAs('viewer');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Transactions' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Customers' })).toHaveCount(0);

    await page.goto('/customers');
    await expect(page).toHaveURL('/forbidden');
    await expect(page.getByRole('heading', { level: 1, name: 'Access denied' })).toBeVisible();
  });

  test('analysts browse customers but cannot create or edit them', async ({ page, signInAs }) => {
    await signInAs('analyst');
    await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('link', { name: 'Customers' })
      .click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('link', { name: 'New customer' })).toHaveCount(0);

    await page.goto('/customers/new');
    await expect(page).toHaveURL('/forbidden');
  });
});
