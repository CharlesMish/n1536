import { expect, test } from '@playwright/test';

const studies = ['average', 'law', 'degrees', 'impulse', 'eigenvalues', 'distances', 'residual', 'fit'];
const viewports = [
  { width: 1920, height: 900 },
  { width: 1440, height: 800 },
  { width: 390, height: 844 },
];

async function monitor(page) {
  const errors = [];
  await page.addInitScript(() => {
    window.immersiveCsp = [];
    document.addEventListener('securitypolicyviolation', event => window.immersiveCsp.push(`${event.effectiveDirective}: ${event.blockedURI}`));
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  return async () => {
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.immersiveCsp)).toEqual([]);
  };
}

async function assertNoHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
}

async function visualSignature(locator) {
  return locator.evaluate(element => {
    const pictures = [...element.querySelectorAll('svg, canvas')].filter(node => node.getClientRects().length);
    return pictures.map(node => node.tagName.toLowerCase() === 'canvas' ? node.toDataURL() : node.outerHTML).join('\n') || element.innerHTML;
  });
}

// These exact desktop sizes include the wide-screen layout that originally left
// DIVERGENCE as a tiny specimen in a large empty canvas. The phone check shares
// the same interaction assertions rather than just checking that a title exists.
for (const viewport of viewports) {
  for (const study of studies) {
    test(`@desktop immersive ${study}: ${viewport.width}×${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const check = await monitor(page);
      await page.goto(`/series/same-${study}.html`);
      await expect(page.getByRole('heading', { name: `SAME ${study.toUpperCase()}`, exact: true })).toBeVisible();
      const stage = page.locator('.exhibit-stage');
      const visual = stage.locator('.exhibit-visual:visible');
      const rail = stage.locator('.exhibit-switcher');
      const buttons = rail.locator('button');
      const reading = stage.locator('.exhibit-reading:visible');
      const notes = page.locator('#study-notes');
      const expectedCases = study === 'fit' ? 4 : 3;
      await expect(visual).toBeVisible();
      await expect(buttons).toHaveCount(expectedCases);
      await expect(notes).not.toHaveAttribute('open', '');
      await expect(reading).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const bounds = await visual.boundingBox();
      expect(bounds.width).toBeGreaterThan(viewport.width * (viewport.width < 600 ? 0.72 : 0.28));
      expect(bounds.height).toBeGreaterThan(viewport.height * (viewport.width < 600 ? 0.23 : study === 'impulse' ? 0.30 : 0.38));
      expect(bounds.x).toBeGreaterThanOrEqual(-1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
      const renderedPictures = await visual.locator('svg, canvas').evaluateAll(nodes => nodes
        .map(node => node.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({ width: rect.width, height: rect.height })));
      expect(renderedPictures.length, 'The opening specimen must contain a rendered figure').toBeGreaterThan(0);
      expect(Math.max(...renderedPictures.map(rect => rect.height))).toBeGreaterThan(viewport.height * (viewport.width < 600 ? 0.19 : 0.26));
      if (viewport.width >= 1000) {
        expect(bounds.y).toBeGreaterThanOrEqual(-1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
        const controls = await rail.boundingBox();
        expect(controls.y + controls.height).toBeLessThanOrEqual(viewport.height + 1);
      } else {
        const controls = await rail.boundingBox();
        expect(controls.y, 'Case choices should be discoverable in the opening phone viewport').toBeLessThanOrEqual(viewport.height + 1);
      }

      const signatures = new Set();
      const readings = new Set();
      for (let index = 0; index < expectedCases; index++) {
        const button = buttons.nth(index);
        await button.click();
        await expect(button).toHaveAttribute('aria-pressed', 'true');
        await expect(rail.locator('button[aria-pressed="true"]')).toHaveCount(1);
        signatures.add(await visualSignature(visual));
        readings.add(await reading.innerText());
        await assertNoHorizontalOverflow(page);
      }
      expect(signatures.size, 'Case selection must change the rendered specimen').toBe(expectedCases);
      expect(readings.size, 'Each authored case must have its own live reading').toBe(expectedCases);

      if (viewport.width === 1920) {
        await buttons.first().focus();
        await page.keyboard.press('ArrowRight');
        await expect(buttons.nth(1)).toBeFocused();
        await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
        await page.keyboard.press('End');
        await expect(buttons.last()).toHaveAttribute('aria-pressed', 'true');
        await page.keyboard.press('Home');
        await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true');
      }

      const trigger = stage.locator('a[href="#study-notes"]');
      await trigger.click();
      await expect(notes).toHaveAttribute('open', '');
      await expect(page.locator('dialog .close-reading')).toBeFocused();
      await page.locator('dialog .close-reading').click();
      await expect(notes).not.toHaveAttribute('open', '');
      await expect(trigger).toBeFocused();
      await assertNoHorizontalOverflow(page);
      await check();
    });
  }

  test(`@desktop immersive divergence paints a large field: ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const check = await monitor(page);
    await page.goto('/series/same-divergence.html');
    await expect(page.locator('#methodName')).toHaveText('Quiet');
    const field = page.locator('#field');
    await expect(field).toBeVisible();
    // Alpha bounds measure the painted mathematics, not the full-size canvas.
    // Sampling in backing pixels and converting to CSS units also covers DPR.
    const paintedBounds = () => field.evaluate(canvas => {
      const { width, height } = canvas;
      const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data;
      let left = width, top = height, right = -1, bottom = -1;
      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          if (pixels[(y * width + x) * 4 + 3] > 20) {
            left = Math.min(left, x); right = Math.max(right, x);
            top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      }
      const box = canvas.getBoundingClientRect();
      return {
        width: Math.max(0, right - left) * box.width / width,
        height: Math.max(0, bottom - top) * box.height / height,
        left: box.x + left * box.width / width,
        right: box.x + right * box.width / width,
      };
    });
    const minimum = viewport.width < 600 ? viewport.width * 0.65 : Math.min(viewport.width * 0.28, viewport.height * 0.52);
    await expect.poll(async () => (await paintedBounds()).width).toBeGreaterThan(minimum);
    const bounds = await paintedBounds();
    expect(bounds.height).toBeGreaterThan(minimum);
    expect(bounds.left).toBeGreaterThanOrEqual(-1);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width + 1);
    const flux = await page.locator('#statFlux').textContent();
    for (const [method, name] of [['slide', 'Slide'], ['spin', 'Spin'], ['quiet', 'Quiet']]) {
      await page.locator(`[data-method="${method}"]`).click();
      await expect(page.locator(`[data-method="${method}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#methodName')).toHaveText(name);
      await expect(page.locator('#statFlux')).toHaveText(flux);
      await expect(page.locator('#checkFail')).toBeHidden();
    }
    await expect(page.locator('#dialog')).not.toBeVisible();
    await page.locator('#readBtn').click();
    await expect(page.locator('#dialog')).toBeVisible();
    await page.locator('#closeReading').click();
    await expect(page.locator('#dialog')).not.toBeVisible();
    await assertNoHorizontalOverflow(page);
    await check();
  });
}
