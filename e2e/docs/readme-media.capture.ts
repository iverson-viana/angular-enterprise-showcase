import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
// gifenc ships no types; the three functions used here are tiny and stable.
// @ts-expect-error -- untyped module
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { PNG } from 'pngjs';

import { DEMO_PASSWORD, waitForIdle } from '../fixtures';

const DOCS = join(process.cwd(), 'docs');
const SHOTS = join(DOCS, 'screenshots');

async function signIn(page: Page, role = 'admin') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(`${role}@ledgerly.dev`);
  await page.getByLabel('Password').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

async function settle(page: Page) {
  await waitForIdle(page);
  await page.waitForTimeout(400); // let transitions finish
}

/** Pre-sets theme / language before the app boots (same keys the app uses). */
async function prefer(page: Page, prefs: { theme?: 'light' | 'dark'; locale?: string }) {
  await page.addInitScript((p) => {
    if (p.theme) localStorage.setItem('ledgerly.theme', p.theme);
    if (p.locale) localStorage.setItem('ledgerly.locale', p.locale);
  }, prefs);
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

test.beforeAll(() => mkdirSync(SHOTS, { recursive: true }));

test('screenshots', async ({ browser }) => {
  const scenes: {
    name: string;
    theme: 'light' | 'dark';
    locale?: string;
    run: (p: Page) => Promise<void>;
  }[] = [
    {
      name: 'dashboard-light',
      theme: 'light',
      run: async (p) => {
        const chart = p.getByRole('group', { name: /Cash flow by month/ });
        await chart.scrollIntoViewIfNeeded();
        await p.evaluate(() => window.scrollTo(0, 0));
        await chart.focus();
        await p.keyboard.press('ArrowLeft');
      },
    },
    { name: 'dashboard-dark', theme: 'dark', run: async () => undefined },
    {
      name: 'customers',
      theme: 'light',
      run: async (p) => {
        await p.goto('/customers?risk=high&sort=balance&dir=desc');
      },
    },
    {
      name: 'customer-form-errors',
      theme: 'light',
      run: async (p) => {
        await p.goto('/customers/new');
        await p.getByRole('button', { name: 'Create customer' }).click();
      },
    },
    {
      name: 'transactions-dark',
      theme: 'dark',
      run: async (p) => {
        await p.goto('/transactions');
      },
    },
    {
      name: 'customers-pt-br',
      theme: 'light',
      locale: 'pt-BR',
      run: async (p) => {
        await p.goto('/customers');
      },
    },
  ];

  for (const scene of scenes) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await prefer(page, { theme: scene.theme });
    await signIn(page); // in English; the scene's own navigation then boots in its locale
    if (scene.locale) {
      await page.evaluate((l) => localStorage.setItem('ledgerly.locale', l), scene.locale);
    }
    await settle(page);
    await scene.run(page);
    await settle(page);
    await shot(page, scene.name);
    await context.close();
  }
});

/** A short click-through recorded as frames, then encoded as an animated GIF. */
test('demo gif', async ({ browser }) => {
  test.setTimeout(120_000);
  const width = 1024;
  const height = 640;
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await prefer(page, { theme: 'light', locale: 'en-US' });

  const frames: { png: Buffer; delay: number }[] = [];
  const frame = async (delay: number) => {
    await settle(page);
    frames.push({ png: await page.screenshot(), delay });
  };

  await page.goto('/login');
  await frame(1400);
  await page.getByRole('button', { name: 'Admin' }).click();
  await frame(900);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
  await frame(1800);

  await page.getByText('Last 3 months').click();
  await frame(1400);

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Customers' })
    .click();
  await frame(1400);
  await page.getByLabel('Risk').selectOption('high');
  await frame(1600);

  await page.getByRole('link', { name: 'New customer' }).click();
  await frame(1000);
  await page.getByRole('button', { name: 'Create customer' }).click();
  await frame(2000);
  await page.getByLabel('Country').selectOption('BR');
  await page.getByLabel('CNPJ').pressSequentially('12abc34501de35');
  await page.getByLabel('Expected monthly volume').pressSequentially('250000');
  await page.getByLabel('Credit limit').pressSequentially('900000');
  await page.getByLabel('Credit limit').blur();
  await page.getByLabel('CNPJ').scrollIntoViewIfNeeded();
  await frame(2400);

  await page.goto('/transactions');
  await frame(1400);
  await page.getByRole('button', { name: /^Language: EN/ }).click();
  await page.getByRole('menuitemradio', { name: 'Português (Brasil)' }).click();
  await frame(1800);
  await page.getByRole('button', { name: 'Tema escuro' }).click();
  await frame(2400);

  await context.close();

  const gif = GIFEncoder();
  for (const { png, delay } of frames) {
    const { data } = PNG.sync.read(png);
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay });
  }
  gif.finish();
  writeFileSync(join(DOCS, 'demo.gif'), gif.bytes());
});
