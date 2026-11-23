import { expect, test } from '@playwright/test';

for (const width of [1024, 1440]) {
  test(`@desktop book keys follow the visible plate at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1024 ? 768 : 900 });
    await page.goto('/series/plates.html#p12');
    const current = page.locator('#toc [aria-current="location"]');
    await expect(current).toHaveAttribute('href', '#p12');
    await page.mouse.wheel(0, -100);
    await expect(current).toHaveAttribute('href', '#p12');
    await page.keyboard.press('j');
    await expect(current).toHaveAttribute('href', '#p13');
    // Scroll away without changing the hash, then request that same hash again.
    await page.locator('#p12').evaluate(el => el.scrollIntoView());
    await expect(current).toHaveAttribute('href', '#p12');
    await page.keyboard.press('ArrowDown');
    await expect(current).toHaveAttribute('href', '#p13');
    await page.locator('#toc a[href="#title"]').click();
    for (const [key, sequence] of [
      ['j', Array.from({ length: 21 }, (_, i) => i + 1)],
      ['k', Array.from({ length: 21 }, (_, i) => 20 - i)]
    ]) {
      for (const number of sequence) {
        await page.keyboard.press(key);
        const id = number ? '#p' + String(number).padStart(2, '0') : '#title';
        await expect(current).toHaveAttribute('href', id);
        expect(new URL(page.url()).hash).toBe(id);
      }
    }
  });
}

test('@desktop LAW compares the first threshold crossings while the controls stay available', async ({ page }) => {
  await page.goto('/series/same-law.html');
  await expect(page.locator('#precisionPlot [data-precision]')).toHaveCount(3);
  await page.locator('[data-start="1"]').click();
  await expect(page.locator('#crossings span')).toHaveText(['2⁻¹² · step 7','2⁻²⁴ · step 16','2⁻⁴⁰ · step 27']);
  await page.locator('[data-bits="12"]').click();
  await expect(page.locator('#crossings [data-selected="true"]')).toContainText('step 7');
  await page.locator('#restart').click();
  await expect(page.locator('#time')).toHaveValue('0');
  await expect(page.locator('#precisionPlot .cursor')).toHaveAttribute('d', /^M42 /);
  await page.locator('[data-start="2"]').click();
  await expect(page.locator('#precisionPair')).toContainText('C from A');
  await expect(page.locator('#crossings span').last()).toContainText('step 28');
});

test('@desktop SHADOW can open and close the cavity at the same section across bodies', async ({ page }) => {
  await page.goto('/series/same-shadow-2.html#well');
  await page.locator('#cutBtn').click();
  const slider = page.getByRole('slider', { name: /Section plane/ });
  await expect(slider).toHaveValue('0');
  await expect(page.locator('#cutDescription')).toContainText('enclosed cavity');
  await expect(page.locator('#statView')).toHaveText('CUT');
  await page.locator('[data-method="prism"]').click();
  await expect(page.locator('#cutDescription')).toContainText('Continuous material');
  await page.locator('[data-method="well"]').click();
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveValue('0.01');
  await page.keyboard.press('End');
  await expect(page.locator('#cutDescription')).toContainText('outside');
  await expect(page.locator('#statMask')).toHaveText('0 px');
  await expect(page.locator('#statVol')).toHaveText('3.05');
  await page.locator('#faceBtn').click();
  await expect(slider).toBeHidden();
  await expect(page.locator('#statView')).toHaveText('FACE');
});
