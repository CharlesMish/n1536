import { expect, test } from '@playwright/test';

const setPair = (page, value) => page.locator('#pairPosition').evaluate((input, value) => {
  input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);

async function layout(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  const boxes = await page.locator('.utility,.hero,.field,.exhibit-reading,.exhibit-tools,.exhibit-switcher').evaluateAll(nodes => nodes.map(n => {
    const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom };
  }));
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
    const p = boxes[a], q = boxes[b];
    expect(Math.min(p.r, q.r) - Math.max(p.x, q.x) > 1 && Math.min(p.b, q.b) - Math.max(p.y, q.y) > 1, `overlap ${a}/${b}`).toBeFalsy();
  }
  // Readout text must fit its own column, not merely the page.
  for (const dd of await page.locator('.values dd').all()) {
    expect(await dd.evaluate(n => n.scrollWidth <= n.clientWidth + 1)).toBeTruthy();
  }
}

test('@desktop @mobile @reduced REACTIONS preserves support readings across cases and themes under CSP', async ({ page }) => {
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => {
    window.reactionsCsp = [];
    document.addEventListener('securitypolicyviolation', e => window.reactionsCsp.push(e.effectiveDirective));
  });
  await page.goto('/series/same-reactions.html');
  await expect(page.locator('#interactive')).toBeVisible();
  await expect(page.locator('#staticPreview')).toBeHidden();
  await expect(page.locator('#study-notes')).not.toHaveAttribute('open', '');
  for (const theme of ['uv', 'paper']) {
    if (theme === 'paper') await page.locator('#theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const [kind, peak, displacement, count] of [['center', '1/4', '1/48', 1], ['pair', '1/8', '11/768', 2], ['uniform', '1/8', '5/384', 17]]) {
      await page.locator(`[data-case="${kind}"]`).click();
      await expect(page.locator('#peakMoment')).toHaveText(peak);
      await expect(page.locator('#midDeflection')).toHaveText(displacement);
      await expect(page.locator('#reactions')).toHaveText('W/2 · W/2');
      await expect(page.locator('[data-case][aria-pressed="true"]')).toHaveCount(1);
      await expect(page.locator('.load-arrow')).toHaveCount(count);
      await expect(page.locator('.reaction-arrow')).toHaveCount(2);
      await expect(page.locator('.reference-curve')).toHaveCount(kind === 'uniform' ? 0 : 2);
      if (kind === 'uniform') await expect(page.locator('#referenceLegend')).toBeHidden();
      else await expect(page.locator('#referenceLegend')).toBeVisible();
      await layout(page);
    }
  }
  await page.locator('#readingLink').click();
  await expect(page.locator('dialog .close-reading')).toBeFocused();
  await expect(page.locator('#study-notes')).toHaveAttribute('open', '');
  await expect(page.locator('.audit tbody tr')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.locator('dialog .close-reading').click();
  await expect(page.locator('#readingLink')).toBeFocused();
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => window.reactionsCsp)).toEqual([]);
});

test('@desktop REACTIONS slider endpoints, native keys and coincident loads remain consistent', async ({ page }) => {
  await page.goto('/series/same-reactions.html');
  await page.locator('[data-case="center"]').click();
  const centered = await page.locator('.selected-curve').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')));
  await page.locator('[data-case="pair"]').click();
  for (const a of [0.1, 0.39, 0.5]) {
    await setPair(page, a);
    await expect(page.locator('#peakMoment')).toHaveText((a / 2).toFixed(5));
    await expect(page.locator('#midDeflection')).toHaveText((a * (3 - 4 * a * a) / 48).toFixed(5));
    await expect(page.locator('#pairPosition')).toHaveAttribute('aria-valuetext', `${a.toFixed(2)} L from each support`);
    await layout(page);
  }
  await expect(page.locator('.load-arrow')).toHaveCount(1);
  expect(await page.locator('.selected-curve').evaluateAll(nodes => nodes.map(n => n.getAttribute('d')))).toEqual(centered);
  await page.locator('#pairPosition').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#pairPosition')).toHaveValue('0.49');
  await expect(page.locator('[data-case="pair"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-case="pair"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-case="uniform"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Home');
  await expect(page.locator('[data-case="center"]')).toBeFocused();
});

for (const width of [1281, 1920, 900]) {
  test(`@desktop REACTIONS layout stays clear at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/series/same-reactions.html');
    await layout(page);
    await setPair(page, 0.39);
    await layout(page);
  });
}

test('@desktop REACTIONS retains its complete static plate without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/series/same-reactions.html');
  await expect(page.locator('#staticPreview img')).toBeVisible();
  expect(await page.locator('#staticPreview img').evaluate(n => n.complete && n.naturalWidth > 0)).toBeTruthy();
  await page.locator('#study-notes summary').click();
  await expect(page.locator('.audit')).toBeVisible();
  await context.close();
});
