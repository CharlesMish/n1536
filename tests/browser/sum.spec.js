import { expect, test } from '@playwright/test';

async function monitor(page) {
  const failures = [];
  page.on('pageerror', e => failures.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  await page.addInitScript(() => {
    window.sumCsp = [];
    document.addEventListener('securitypolicyviolation', e => window.sumCsp.push(e.effectiveDirective));
  });
  return async () => {
    expect(failures).toEqual([]);
    expect(await page.evaluate(() => window.sumCsp)).toEqual([]);
  };
}
const scrub = (page, value) => page.locator('#step').evaluate((input, value) => {
  input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
}, value);

test('@desktop @mobile @reduced SUM has three inspectable orders in both themes under CSP', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-sum.html');
  await expect(page.locator('#ledgerStatus')).toHaveText('✓ 9 checks');
  await expect(page.locator('#study-notes')).not.toHaveAttribute('open', '');
  const exact = await page.locator('#exactTotal').textContent();
  for (const theme of ['uv', 'paper']) {
    if (theme === 'paper') await page.locator('#theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const [index, title, error, count] of [[0, 'Given', '−670 × 2⁻²⁰', '763'], [1, 'Ascending', '+101 × 2⁻²⁰', '1'], [2, 'Descending', '0 · exact', '0']]) {
      await page.locator(`[data-case="${index}"]`).click();
      await expect(page.locator('#caseName')).toHaveText(title);
      await expect(page.locator('#totalError')).toHaveText(error);
      await expect(page.locator('#roundedCount')).toHaveText(`${count} / 1,536`);
      await expect(page.locator('#exactTotal')).toHaveText(exact);
      await expect(page.locator('[data-case][aria-pressed="true"]')).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
      const boxes = await page.locator('.utility,.exhibit-heading,.sum-field,.exhibit-reading,.exhibit-tools,.exhibit-switcher').evaluateAll(nodes => nodes.map(n => {
        const b=n.getBoundingClientRect();return {x:b.x,y:b.y,r:b.right,b:b.bottom};
      }));
      for (let a=0;a<boxes.length;a++) for(let b=a+1;b<boxes.length;b++) {
        const p=boxes[a],q=boxes[b];
        expect(Math.min(p.r,q.r)-Math.max(p.x,q.x)>1 && Math.min(p.b,q.b)-Math.max(p.y,q.y)>1, `overlap ${a}/${b}`).toBeFalsy();
      }
    }
  }
  await expect(page.locator('#prevRound')).toBeDisabled();
  await expect(page.locator('#nextRound')).toBeDisabled();
  await page.locator('a[href="#study-notes"]').click();
  await expect(page.locator('#study-notes')).toHaveAttribute('open', '');
  await expect(page.locator('#checkList .pass')).toHaveCount(9);
  await expect(page.locator('#study-notes')).toContainText('A negative correction means the stored result rounded upward');
  await check();
});

test('@desktop SUM exposes signed correction, cancellation, playback and keyboard inspection', async ({ page }) => {
  const check = await monitor(page);
  await page.goto('/series/same-sum.html');
  await page.locator('[data-case="1"]').click();
  await page.locator('#nextRound').click();
  await expect(page.locator('#step')).toHaveValue('1535');
  await expect(page.locator('#stepLine')).toContainText('correction −101 × 2⁻²⁰ · rounded upward');
  await expect(page.locator('#bitsDesc')).toContainText('rounded upward');
  await expect(page.locator('#nextRound')).toBeDisabled();
  await scrub(page, 1536);
  await expect(page.locator('#stepLine')).toContainText('exact addition · correction 0');
  await expect(page.locator('#totalError')).toHaveText('+101 × 2⁻²⁰');
  await page.locator('#prevRound').click();
  await expect(page.locator('#step')).toHaveValue('1535');
  await page.locator('[data-case="1"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#caseName')).toHaveText('Descending');
  await scrub(page, 2);
  await expect(page.locator('#bitsDesc')).toContainText('stored result is zero');
  await expect(page.locator('#windowFrame')).toBeHidden();
  await page.locator('#restart').click();
  await expect(page.locator('#step')).toHaveValue('0');
  await page.locator('#play').click();
  await expect.poll(() => page.locator('#step').inputValue()).not.toBe('0');
  await page.locator('[data-case="0"]').click();
  await expect(page.locator('#play')).toHaveText('Play');
  await scrub(page, 1535);
  await page.locator('#play').click();
  await expect(page.locator('#step')).toHaveValue('1536');
  await expect(page.locator('#play')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#step').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#step')).toHaveValue('1535');
  await expect(page.locator('#caseName')).toHaveText('Given');
  await check();
});


for (const viewport of [{width:1101,height:740},{width:1280,height:740},{width:1920,height:780}]) {
  test(`@desktop SUM reading clears the utility at ${viewport.width}×${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/series/same-sum.html');
    for (const i of [0,1,2]) {
      await page.locator(`[data-case="${i}"]`).click();
      const top = await page.locator('.utility').boundingBox();
      const reading = await page.locator('.exhibit-reading').boundingBox();
      expect(reading.y).toBeGreaterThan(top.y + top.height);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    }
  });
}
