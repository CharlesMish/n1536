import { expect, test } from '@playwright/test';
const pages = ['../same-n','same-shadow-2','same-earth','same-sites3','same-samples-2','same-volume-series-pass','same-marginals-2','same-average','same-magnitude-2','same-law','same-moves','same-divergence','same-degrees','same-impulse','same-eigenvalues','same-distances','same-residual','same-fit','same-sum','same-reactions'];
for (const width of [1440, 390]) for (const slug of pages) {
  test(`@desktop shared reading ${slug} at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/series/${slug}.html`);
    const trigger = page.locator('[data-study-reading-trigger]').first();
    await expect(trigger).toHaveText('Read the study');
    await trigger.click();
    const dialog = page.getByRole('dialog');
    const close = dialog.getByRole('button', { name: 'Close study explanation' });
    await expect(dialog).toBeVisible();
    await expect(close).toBeFocused();
    expect(await dialog.evaluate(n => n.scrollWidth <= n.clientWidth + 1)).toBeTruthy();
    const box = await dialog.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(901);
    const selection = await page.locator('[aria-pressed="true"]').evaluateAll(nodes => nodes.map(n => n.id + n.textContent));
    await page.keyboard.press('3');
    expect(await page.locator('[aria-pressed="true"]').evaluateAll(nodes => nodes.map(n => n.id + n.textContent))).toEqual(selection);
    // Native modal focus containment includes backwards wrapping from Close.
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate(n => n.contains(document.activeElement))).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await page.locator('#theme, #themeBtn').click();
    await trigger.click();
    expect(await dialog.evaluate(n => n.scrollWidth <= n.clientWidth + 1)).toBeTruthy();
    await close.click();
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    if (slug === 'same-divergence' || slug === 'same-reactions') {
      await trigger.click();
      const rect = await dialog.boundingBox();
      await page.mouse.click(rect.x + 3, rect.y + 3);
      await expect(dialog).toBeVisible();
      await page.mouse.click(2, 2);
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}


test('@desktop Fit audit deep links enter the reading dialog and return focus', async ({ page }) => {
  await page.goto('/series/same-fit.html');
  await page.locator('#stageAudit').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#audit')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#stageAudit')).toBeFocused();
  await page.goto('/series/same-fit.html#audit');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#audit')).toHaveAttribute('open', '');
});


test('@desktop SAME N notes remain reachable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/same-n.html');
  await page.locator('#study-notes > summary').click();
  await expect(page.locator('#study-notes')).toContainText('NN CV');
  await expect(page.locator('#study-notes')).toHaveAttribute('open', '');
  const rect = await page.locator('#study-notes').boundingBox();
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.y + rect.height).toBeLessThanOrEqual(844);
  await context.close();
});
