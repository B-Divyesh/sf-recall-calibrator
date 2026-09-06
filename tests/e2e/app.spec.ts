import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Page = import('@playwright/test').Page;

async function openDemo(page: Page) {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Review sample recall and grades.' })).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
}

async function addCard(page: Page, question: string, answers: string, options: { keywords?: string; interval?: number } = {}) {
  await page.goto('/cards?demo=1');
  await page.getByLabel('Question').fill(question);
  await page.getByLabel(/Accepted answer/).fill(answers);
  if (options.keywords) {
    await page.locator('input[name="matchMode"][value="keywords"]').check();
    await page.locator('#keywords').fill(options.keywords);
  }
  if (options.interval) await page.getByLabel(/Current interval/).fill(String(options.interval));
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.getByText(question, { exact: true })).toBeVisible();
}

async function startReview(page: Page) {
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.getByLabel('What can you retrieve?')).toBeVisible();
}

async function revealCurrentCard(page: Page, answer: string) {
  await page.getByLabel('What can you retrieve?').fill(answer);
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByRole('button', { name: /Good/ })).toBeVisible();
}

async function finishCurrentCard(page: Page, answer: string, grade: 'Again' | 'Hard' | 'Good' | 'Easy' = 'Good') {
  await revealCurrentCard(page, answer);
  await page.getByRole('button', { name: new RegExp(`\\b${grade}\\b`) }).click();
  await expect(page.getByRole('heading', { name: 'Compare the two signals.' })).toBeVisible();
}

async function tabTo(page: Page, text: string) {
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press('Tab');
    const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+/g, ' ') ?? '');
    if (activeText === text) return;
  }
  throw new Error(`Could not reach ${text} by keyboard`);
}

test('@claim:demo-isolation sample data is separate from ordinary local cards and reviews', async ({ page }) => {
  await page.goto('/cards');
  await page.getByLabel('Question').fill('Real card stays private');
  await page.getByLabel(/Accepted answer/).fill('Real answer');
  await page.getByRole('button', { name: 'Add card' }).click();
  await expect(page.getByText('Real card stays private')).toBeVisible();

  await openDemo(page);
  await expect(page.getByText('8 reviews', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('8 reviews', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();

  await expect(page).toHaveURL(/\/cards$/);
  await expect(page.getByText('Real card stays private')).toBeVisible();
  await expect(page.getByText('What is the capital of Japan?')).toHaveCount(0);
});

test('@claim:privacy-local cards and reviews remain in browser storage after reload', async ({ page }) => {
  await openDemo(page);
  await addCard(page, 'Persist this local card', 'Stored locally');
  await page.reload();
  await expect(page.getByText('Persist this local card')).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
});

test('@claim:no-account-payment a complete review needs no account or payment', async ({ page }) => {
  await openDemo(page);
  await expect(page.locator('input[type="email"], input[type="password"], iframe')).toHaveCount(0);
  await startReview(page);
  await finishCurrentCard(page, 'Hyper Text Transfer Protocol');
  await expect(page.getByText('Suggested next interval')).toBeVisible();
});

test('@claim:no-remote-store a demo review sends no request outside this origin', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  await openDemo(page);
  await startReview(page);
  await finishCurrentCard(page, 'Hyper Text Transfer Protocol');
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('@claim:exact-match normalized exact recall produces a match result', async ({ page }) => {
  await openDemo(page);
  await startReview(page);
  await finishCurrentCard(page, ' hyper-text transfer protocol ');
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
});

test('@claim:keyword-match required keywords produce a partial result when one is missing', async ({ page }) => {
  await openDemo(page);
  await addCard(page, 'Name the gases', 'Carbon dioxide and water', { keywords: 'carbon dioxide, water', interval: 5 });
  await startReview(page);
  await finishCurrentCard(page, 'water', 'Hard');
  await expect(page.getByText('Partial', { exact: true })).toBeVisible();
});

test('@claim:accepted-answers an alternate accepted answer produces a match', async ({ page }) => {
  await openDemo(page);
  await addCard(page, 'What is the chemical symbol for mercury?', 'Mercury\nHg');
  await startReview(page);
  await finishCurrentCard(page, 'Hg');
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
});

test('@claim:sealed-proxy typed result stays unavailable until a self-grade is chosen', async ({ page }) => {
  await openDemo(page);
  await startReview(page);
  await revealCurrentCard(page, 'Hyper Text Transfer Protocol');
  const beforeGrade = await page.locator('main').ariaSnapshot();
  expect(beforeGrade).not.toContain('Typed result: Match');
  await page.getByRole('button', { name: /\bGood\b/ }).click();
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
});

test('@claim:calibration-report sample data reports alignment and review history', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Grade alignment')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review history' })).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(8);
});

test('@claim:calibration-tendency sample data reports grade tendency and a recent trend', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole('heading', { name: 'Your grade tendency' })).toBeVisible();
  await expect(page.getByText(/recent grade gap/)).toBeVisible();
});

test('@claim:transparent-interval a match shows the rule and the calculated interval', async ({ page }) => {
  await openDemo(page);
  await addCard(page, 'What is two times five?', '10', { interval: 10 });
  await startReview(page);
  await finishCurrentCard(page, '10');
  await expect(page.getByText('25 days', { exact: true })).toBeVisible();
  await expect(page.getByText(/match multiplies the current interval by 2.5/)).toBeVisible();
});

test('@claim:csv-export demo reviews export as a CSV with one data row per review', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export review CSV' }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), 'utf8');
  const rows = csv.trim().split('\n');
  expect(rows[0]).toContain('proxy_result');
  expect(rows).toHaveLength(9);
});

test('@claim:json-restore a JSON export restores cards and reviews after deletion', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const exported = await readFile(await (await downloadPromise).path(), 'utf8');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete local data' }).click();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('0 total', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Data', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#import-json').setInputFiles({ name: 'recall-calibrator.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('3 total', { exact: true })).toBeVisible();
  await expect(page.getByText('What does HTTP stand for?')).toBeVisible();
});

test('@claim:delete-local-data deleting demo data removes every sample card', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete local data' }).click();
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('0 total', { exact: true })).toBeVisible();
  await expect(page.getByText('What is the capital of Japan?')).toHaveCount(0);
});

test('@claim:offline-reload demo data and the app shell reload while offline after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await openDemo(page);
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Review sample recall and grades.' })).toBeVisible();
    await expect(page.getByText('Offline · changes safe')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:pwa-install the demo is controlled by an installable standalone PWA manifest', async ({ page }) => {
  await openDemo(page);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href;
    return href ? await (await fetch(href)).json() as { display: string; icons: Array<{ sizes: string }> } : null;
  });
  expect(manifest?.display).toBe('standalone');
  expect(manifest?.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

test('@claim:keyboard-mobile the full demo review works by keyboard at 390 pixels', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openDemo(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await tabTo(page, 'Review');
  await page.keyboard.press('Enter');
  await tabTo(page, 'Start review');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('What can you retrieve?')).toBeFocused();
  await page.keyboard.type('Hyper Text Transfer Protocol');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /\bAgain\b/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Compare the two signals.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('@claim:reduced-motion the demo disables visual movement when requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?demo=1');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  expect(await page.locator('.hero-art').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  expect(Number.parseFloat(await page.locator('.button').first().evaluate((element) => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
});

test('sets route-specific titles, has no serious accessibility issues, and renders an in-app 404 during local fallback', async ({ page }) => {
  const routes: Array<[string, string]> = [['/', 'Recall Calibrator — compare recall and grades'], ['/demo', 'Demo — Recall Calibrator'], ['/review', 'Review recall — Recall Calibrator'], ['/cards', 'Cards — Recall Calibrator'], ['/insights', 'Insights — Recall Calibrator'], ['/settings', 'Data — Recall Calibrator'], ['/privacy', 'Privacy — Recall Calibrator'], ['/terms', 'Terms — Recall Calibrator'], ['/not-a-real-route', 'Page not found — Recall Calibrator']];
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    expect(await page.locator('h1').count()).toBe(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
  await expect(page.getByRole('heading', { name: 'That page was not found.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Recall Calibrator' })).toBeVisible();
});

test('keeps malformed imports recoverable and preserves demo data', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  await page.locator('#import-json').setInputFiles({
    name: 'malformed-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 1, exportedAt: '2026-09-06T00:00:00.000Z', cards: [{ id: 'broken' }], reviews: [], settings: { sampleSize: 20, normalizedPunctuation: true } })),
  });
  await expect(page.locator('#import-status')).toContainText('cards[0].prompt must be non-empty text');
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('3 total', { exact: true })).toBeVisible();
});
