import { expect, test, waitForIdle } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ signInAs }) => signInAs('analyst'));

  test('the period lives in the URL and the chart reads out with the keyboard', async ({
    page,
  }) => {
    await page.getByText('Last 3 months').click();
    await expect(page).toHaveURL(/[?&]range=3m/);
    await expect(page.getByText('Monthly inflow and outflow, last 3 months (USD)')).toBeVisible();

    const chart = page.getByRole('group', { name: /Cash flow by month/ });
    await chart.focus();
    await page.keyboard.press('Home');
    await expect(chart.locator('[aria-live]')).toHaveText(/^\w+ \d{4}: Inflow \$[\d,]+, Outflow/);
  });
});

test.describe('transactions feed', () => {
  test.beforeEach(async ({ signInAs }) => signInAs('analyst'));

  test('loads more rows as you scroll and keeps the real row count for screen readers', async ({
    page,
  }) => {
    await page.goto('/transactions');
    await waitForIdle(page);

    const summary = page.getByText(/^Showing [\d,]+ of [\d,]+ transactions$/);
    await expect(summary).toBeVisible();
    const numbersIn = async () =>
      ((await summary.textContent())!.match(/[\d,]+/g) ?? []).map((n) =>
        Number(n.replace(/,/g, '')),
      );
    const [before, total] = await numbersIn();

    // The full count is exposed even though only a page is loaded (+1 for the header row).
    const table = page.getByRole('table', { name: 'Transactions' });
    await expect(table).toHaveAttribute('aria-rowcount', String(total + 1));
    expect(total).toBeGreaterThan(1000);
    const loaded = async () => (await numbersIn())[0];

    // Only a window of rows is in the DOM, whatever has been loaded.
    expect(await page.getByRole('row').count()).toBeLessThan(60);

    const viewport = page.locator('cdk-virtual-scroll-viewport');
    await viewport.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await expect.poll(loaded).toBeGreaterThan(before);
  });

  test('filters are reflected in the URL and restart the feed', async ({ page }) => {
    await page.goto('/transactions');
    await waitForIdle(page);

    await page.getByLabel('Status').selectOption('flagged');
    await expect(page).toHaveURL(/[?&]status=flagged/);
    await waitForIdle(page);
    const statuses = page.getByRole('row').locator('[role="cell"]:nth-child(4)');
    await expect(statuses.first()).toHaveText('Flagged');
    await expect(statuses.filter({ hasNotText: 'Flagged' })).toHaveCount(0);
  });
});
