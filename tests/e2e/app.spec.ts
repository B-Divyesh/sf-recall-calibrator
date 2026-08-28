import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('completes an evidence-first review and reports calibration', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Load example cards' }).click();
  await page.getByRole('link', { name: 'Review', exact: true }).click();
  await page.getByRole('button', { name: 'Start review' }).click();
  const prompt = await page.locator('.prompt-sheet > h2').textContent();
  const answer = prompt?.includes('Japan') ? 'Tokyo' : prompt?.includes('photosynthesis') ? 'carbon dioxide and water' : 'Hypertext Transfer Protocol';
  await page.getByLabel('What can you retrieve?').fill(answer);
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(page.getByText('Typed-recall proxy is match')).toBeAttached();
  await page.getByRole('button', { name: /Good/ }).click();
  await expect(page.getByRole('heading', { name: 'Your signals aligned.' })).toBeVisible();
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
