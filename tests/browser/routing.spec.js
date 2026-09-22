import { expect, test } from '@playwright/test';

// Also run against real Workers Static Assets via playwright.workers.config.js.
// Filesystem-only checks cannot detect directory-URL resource resolution bugs.
for (const entry of ['/', '/series', '/series/', '/series/index.html']) {
  test(`@desktop @mobile collection resources resolve from ${entry}`, async ({ page }) => {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(entry);
    await expect(page).toHaveURL(/\/series\/(?:index\.html)?$/);
    await expect(page.locator('.card')).toHaveCount(19);
    // A stylesheet must actually apply, not merely exist in the build.
    await expect(page.locator('.card').first()).toHaveCSS('display', 'flex');
    await expect(page.locator('img')).toHaveCount(16);
    await page.locator('img').evaluateAll(images => images.forEach(image => { image.loading = 'eager'; }));
    await expect.poll(() => page.locator('img').evaluateAll(images =>
      images.filter(image => !image.complete || image.naturalWidth === 0).map(image => ({src: image.src, complete: image.complete, width: image.naturalWidth}))
    )).toEqual([]);
    const links = await page.locator('.card').evaluateAll(cards => cards.map(card => card.href));
    expect(links.every(link => new URL(link).pathname.startsWith('/series/'))).toBe(true);
    await page.getByRole('link', { name: 'book of plates →', exact: true }).click();
    await expect(page.locator('.spread')).toHaveCount(19);
    expect(failures).toEqual([]);
  });
}

test('@desktop homepage reaches collection without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + '/');
  await expect(page.locator('.card')).toHaveCount(19);
  await expect(page.locator('.card').first()).toHaveCSS('display', 'flex');
  await context.close();
});

test('@desktop N keeps its own address and query through the old study link', async ({ page }) => {
  await page.goto('/series/same-n.html?renderer=canvas2d#study');
  await expect(page).toHaveURL(/\/same-n(?:\.html)?\?renderer=canvas2d#study$/);
  await expect(page.getByRole('heading', { name: 'SAME N', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to SAME series', exact: true }).click();
  await expect(page.locator('.card')).toHaveCount(19);
});
