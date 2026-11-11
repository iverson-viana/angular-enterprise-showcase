import { expect, test, waitForIdle } from './fixtures';

test.describe('customers list', () => {
  test.beforeEach(async ({ signInAs }) => signInAs('analyst'));

  test('keeps filters and paging in the URL (shareable, survives reload and Back)', async ({
    page,
  }) => {
    await page.goto('/customers');
    await waitForIdle(page);

    await page.getByLabel('Risk').selectOption('high');
    await expect(page).toHaveURL(/[?&]risk=high/);
    await waitForIdle(page);
    const riskCells = page.getByRole('row').locator('td:nth-child(4)');
    await expect(riskCells.first()).toHaveText('High');
    await expect(riskCells.filter({ hasNotText: 'High' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/[?&]page=2/);

    await page.reload();
    await expect(page.getByLabel('Risk')).toHaveValue('high');
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page).toHaveURL(/risk=high/);
  });

  test('sorts by a column and exposes the order to assistive tech', async ({ page }) => {
    await page.goto('/customers');
    await waitForIdle(page);

    await page.getByRole('button', { name: 'Balance' }).click();
    await expect(page).toHaveURL(/sort=balance/);
    await expect(page.getByRole('columnheader', { name: 'Balance' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });
});

test.describe('customer onboarding (admin)', () => {
  test.beforeEach(async ({ signInAs }) => signInAs('admin'));

  test('an invalid submit shows a focused error summary that links to each field', async ({
    page,
  }) => {
    await page.goto('/customers/new');
    await page.getByRole('button', { name: 'Create customer' }).click();

    const summary = page.getByRole('region', { name: /problems with this form/ });
    await expect(summary).toBeFocused();
    await expect(summary).toContainText('There are 8 problems with this form');

    await summary.getByRole('button', { name: 'Enter the legal name.' }).click();
    await expect(page.getByLabel('Legal name')).toBeFocused();
  });

  test('creates a customer end to end', async ({ page }) => {
    await page.goto('/customers');
    await page.getByRole('link', { name: 'New customer' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'New customer' })).toBeVisible();

    await page.getByLabel('Legal name').fill('Quarrytide Holdings S.A.');
    await page.getByLabel('Segment').selectOption('corporate');
    await page.getByLabel('Country').selectOption('BR');

    const taxId = page.getByLabel('CNPJ');
    await taxId.pressSequentially('12abc34501de35');
    await expect(taxId).toHaveValue('12.ABC.345/01DE-35'); // live mask

    await page.getByLabel('IBAN').fill('BR1800360305000010009795493C1');
    await page.getByLabel('Expected monthly volume').pressSequentially('250000');
    await expect(page.getByLabel('Expected monthly volume')).toHaveValue('250,000');
    await page.getByLabel('Full name').fill('Ana Example');
    await page.getByLabel('Email').fill('ana@quarrytide.example');
    await page.getByLabel(/I confirm the KYC documents/).check();

    await page.getByRole('button', { name: 'Create customer' }).click();

    await expect(
      page.getByText('Quarrytide Holdings S.A. was created and is now in onboarding.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/customers\?q=C-\d+/);
    const row = page.getByRole('row', { name: /Quarrytide Holdings S\.A\./ });
    await expect(row).toContainText('Onboarding');
  });

  test('edits an existing customer', async ({ page }) => {
    await page.goto('/customers');
    await waitForIdle(page);
    const firstName = (await page.locator('tbody th span').first().textContent())!.trim();

    await page
      .getByRole('link', { name: `Edit ${firstName}` })
      .first()
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Edit customer' })).toBeVisible();
    await expect(page.getByLabel('Legal name')).toHaveValue(firstName);

    const credit = page.getByLabel('Credit limit');
    await credit.fill('');
    await credit.pressSequentially('10000');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText(`${firstName} was updated.`)).toBeVisible();
    await expect(page).toHaveURL(/\/customers\?q=C-\d+/);
  });

  test('asks before discarding unsaved changes', async ({ page }) => {
    await page.goto('/customers/new');
    await page.getByLabel('Legal name').fill('Half-typed Co');

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('unsaved changes');
      void dialog.dismiss();
    });
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/customers/new');
  });
});
