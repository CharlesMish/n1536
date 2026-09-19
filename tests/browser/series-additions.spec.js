import { expect, test } from '@playwright/test';

const additions = [
  ['same-moves', 'SAME MOVES'], ['same-divergence', 'SAME DIVERGENCE'],
  ['same-degrees', 'SAME DEGREES'], ['same-impulse', 'SAME IMPULSE'],
  ['same-eigenvalues', 'SAME EIGENVALUES'],
];
async function monitor(page) {
  const errors = [];
  await page.addInitScript(() => {
    window.seriesCspViolations = [];
    document.addEventListener('securitypolicyviolation', e => window.seriesCspViolations.push(`${e.effectiveDirective}: ${e.blockedURI}`));
  });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return async () => {
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => window.seriesCspViolations)).toEqual([]);
  };
}
async function scrub(page, id, value) {
  await page.locator(id).evaluate((element, next) => {
    element.value = String(next);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

for (const [file, title] of additions) {
  test(`@desktop @mobile @reduced ${title} has usable controls and no CSP or layout failures`, async ({ page }) => {
    const check = await monitor(page);
    await page.goto(`/series/${file}.html`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const theme = page.locator('#theme, #themeBtn');
    await expect(theme).toBeVisible();
    await theme.click();
    await theme.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    const reading = page.locator('summary, #readBtn, .read-study').first();
    await reading.click();
    if (await page.locator('dialog').count()) {
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    } else await expect(page.locator('details')).toHaveAttribute('open', '');
    await check();
  });
}

test('@desktop Degrees preserves the count while changing reachability', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-degrees.html');
  await scrub(page, '#hop', 4);
  await expect(page.locator('#reached')).toHaveText('12');
  await page.getByRole('button', { name: '03 Apart', exact: true }).click();
  await expect(page.locator('#reached')).toHaveText('6');
  await expect(page.locator('#unreachable')).toHaveText('6');
  await expect(page.locator('#degreeRoster li')).toHaveCount(12);
  await page.locator('#source').selectOption('8');
  await expect(page.locator('#source')).toHaveValue('8');
  await expect(page.locator('#reached')).toHaveText('1');
  await scrub(page, '#hop', 4);
  await expect(page.locator('#reached')).toHaveText('6');
  await page.locator('#hop').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#reached')).toHaveText('1');
  await page.locator('#step').click();
  await expect(page.locator('#reached')).toHaveText('4');
  await check();
});

test('@desktop Eigenvalues exposes the fixed-start peak and native range keys', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-eigenvalues.html');
  await expect(page.locator('#peakNorm')).toHaveText('3.011×');
  await page.locator('[data-k="0"]').click();
  await expect(page.locator('#peakNorm')).toHaveText('1.000×');
  await page.locator('#coupling').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#coupling')).toHaveValue('12');
  await page.locator('#showPeak').click();
  await expect(page.locator('#currentNorm')).toHaveText('3.011');
  await page.locator('#restart').click();
  await expect(page.locator('#time')).toHaveValue('0');
  await expect(page.locator('#currentNorm')).toHaveText('1.000');
  await check();
});

test('@desktop Impulse spacing changes residual response while force area stays fixed', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-impulse.html');
  await expect(page.locator('#cases')).toContainText('1.000');
  const before = await page.locator('#cases').innerText();
  await page.locator('#fullPeriod').click();
  await expect(page.locator('#spacing')).toHaveValue('2');
  expect(await page.locator('#cases').innerText()).not.toEqual(before);
  await expect(page.locator('#cases')).toContainText('1.000');
  await page.locator('#time').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#time')).toHaveValue('8');
  await page.locator('#restart').click();
  await expect(page.locator('#time')).toHaveValue('0');
  await check();
});

test('@desktop Moves reaches its commuting endpoint and respects range focus', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-moves.html');
  await expect(page.locator('#stage')).toHaveAttribute('aria-busy', 'false');
  await page.locator('#lambdaIn').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#lambdaIn')).toHaveValue('0');
  await expect(page.locator('#lambdaOut')).toContainText('0.00');
  await expect(page.locator('#statSpread')).toHaveText('0 · one point');
  await page.locator('#lambdaIn').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#lambdaIn')).toHaveValue('0.01');
  await check();
});

test('@desktop Divergence keeps its flux through all three flows', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-divergence.html');
  const flux = await page.locator('#statFlux').textContent();
  for (const key of ['2', '3', '1']) {
    await page.locator('#field').focus();
    await page.keyboard.press(key);
    await expect(page.locator('#statFlux')).toHaveText(flux);
    await expect(page.locator('#checkFail')).toBeHidden();
  }
  await page.locator('#field').focus();
  const source = await page.locator('#statSource').innerText();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#statSource')).not.toHaveText(source);
  await check();
});

test('@desktop catalog and book retain every study without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/series/index.html');
  await expect(page.locator('.card')).toHaveCount(18);
  await page.locator('.card').last().click();
  await expect(page.getByRole('heading', { name: 'SAME FIT', exact: true })).toBeVisible();
  await page.goto('http://127.0.0.1:4173/series/plates.html#p18');
  await expect(page.locator('.spread')).toHaveCount(18);
  await expect(page.locator('#p18')).toContainText('FIT');
  await context.close();
});
