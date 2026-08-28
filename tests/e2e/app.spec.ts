import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function tabToText(page: import('@playwright/test').Page, text: string) {
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab');
    const activeText = await page.evaluate(() => document.activeElement?.textContent?.trim().replace(/\s+/g, ' ') ?? '');
    if (activeText === text) return;
  }
  throw new Error(`Could not reach ${text} with Tab`);
}

async function openRevealedReview(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example cards' }).click();
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Start review' }).click();
  const prompt = await page.locator('.prompt-sheet > h2').textContent();
  const answer = prompt?.includes('Japan') ? 'Tokyo' : prompt?.includes('photosynthesis') ? 'carbon dioxide and water' : 'Hypertext Transfer Protocol';
  await page.getByLabel('What can you retrieve?').fill(answer);
  await page.getByRole('button', { name: 'Reveal answer' }).click();
}

test('keeps the deterministic proxy sealed through self-grading and reports calibration afterwards', async ({ page }) => {
  await openRevealedReview(page);
  await expect(page.getByText(/Typed-recall proxy is (match|partial|miss)/i)).toHaveCount(0);
  await expect(page.getByText('Your typed recall · proxy sealed')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  await page.getByRole('button', { name: /Good/ }).click();
  await expect(page.getByRole('heading', { name: 'Your signals aligned.' })).toBeVisible();
  await expect(page.getByText('Match', { exact: true })).toBeVisible();
  await expect(page.getByText('Proxy-led next interval')).toBeVisible();
});

test('has no serious accessibility violations on primary screens', async ({ page }) => {
  for (const path of ['/', '/cards', '/insights', '/settings', '/privacy', '/terms']) {
    await page.goto(path);
    expect(await page.locator('h1').count()).toBe(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''))).toEqual([]);
  }
});

test('works at 390px and reloads while offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example cards' }).click();
  await page.evaluate(() => navigator.serviceWorker?.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /Did you recall it/ })).toBeVisible();
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await expect(page.getByText('Offline · changes safe')).toBeAttached();
});

test('keeps all documented compact-screen targets usable and the sealed label unobscured', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const target of [
    page.getByRole('link', { name: 'Recall Calibrator home' }),
    page.getByRole('link', { name: 'Privacy', exact: true }),
    page.getByRole('link', { name: 'Terms', exact: true }),
  ]) {
    const box = await target.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }

  await openRevealedReview(page);
  const label = await page.getByText('Your typed recall · proxy sealed').boundingBox();
  const badge = await page.getByText('Recorded', { exact: true }).boundingBox();
  expect(label).not.toBeNull();
  expect(badge).not.toBeNull();
  expect((label?.x ?? 0) + (label?.width ?? 0)).toBeLessThanOrEqual((badge?.x ?? 0) - 8);
});

test('rejects malformed v1 imports before confirmation and preserves renderable local data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example cards' }).click();
  await page.getByRole('link', { name: 'Data', exact: true }).click();
  let confirmationCount = 0;
  page.on('dialog', async (dialog) => {
    confirmationCount += 1;
    await dialog.accept();
  });

  await page.locator('#import-json').setInputFiles({
    name: 'malformed-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-08-28T00:00:00.000Z',
      cards: [{ id: 'broken' }],
      reviews: [],
      settings: { sampleSize: 20, normalizedPunctuation: true },
    })),
  });

  await expect(page.locator('#import-status')).toContainText('cards[0].prompt must be non-empty text');
  expect(confirmationCount).toBe(0);
  await page.getByRole('link', { name: 'Cards', exact: true }).click();
  await expect(page.getByText('3 total')).toBeVisible();
  await expect(page.getByText('What is the capital of Japan?')).toBeVisible();
  await page.reload();
  await expect(page.getByText('3 total')).toBeVisible();
  await expect(page.getByText('The local drawer would not open.')).toHaveCount(0);
});

test('supports the complete 390px review path with keyboard only', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();

  await tabToText(page, 'Load example cards');
  await page.keyboard.press('Enter');
  await tabToText(page, 'Review');
  await page.keyboard.press('Enter');
  await tabToText(page, 'Start review');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('What can you retrieve?')).toBeFocused();
  await page.keyboard.type('Tokyo');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Again/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Check the registration.' })).toBeVisible();
});
