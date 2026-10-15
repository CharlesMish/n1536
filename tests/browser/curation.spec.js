import { test, expect } from '@playwright/test';

async function watch(page) {
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.curationViolations=[];
    document.addEventListener('securitypolicyviolation',event=>window.curationViolations.push(event.effectiveDirective));
  });
  return async()=>{
    expect(errors).toEqual([]);
    expect(await page.evaluate(()=>window.curationViolations)).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  };
}

test('@desktop @mobile @reduced curated entrance preserves all studies and keyboard navigation', async({page},info)=>{
  const check=await watch(page);
  await page.goto('/series/');
  await expect(page.locator('.card:visible')).toHaveCount(6);
  expect(await page.locator('.card:visible h2').allTextContents()).toEqual(['SAME N','SAME SHADOW','SAME SITES','SAME DEGREES','SAME FIT','SAME REACTIONS']);
  await page.locator('.card:visible').nth(2).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.card:visible').nth(3)).toBeFocused();
  await page.getByRole('button',{name:'All studies · 20'}).click();
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await page.reload();
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await page.locator('.card[data-file="same-eigenvalues.html"]').click();
  await page.getByRole('link',{name:'← Series',exact:true}).click();
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await page.getByRole('button',{name:'Start here · 6'}).click();
  await page.screenshot({path:info.outputPath('entrance.png'),fullPage:!info.project.name.includes('mobile'),timeout:60000});
  await check();
});

test('@desktop @mobile @reduced FIT enters the quartet directly and preserves comparison state',async({page},info)=>{
  const check=await watch(page);
  await page.goto('/series/same-fit.html');
  const compare=page.getByRole('link',{name:'Compare all four'});
  if(page.viewportSize().width<=760){
    const tabs=await page.locator('.fit-datasets').boundingBox();
    const link=await compare.boundingBox();
    expect(link.y-tabs.y-tabs.height).toBeGreaterThanOrEqual(0);
    expect(link.y-tabs.y-tabs.height).toBeLessThan(30);
  }
  await compare.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#sceneTitle')).toBeInViewport();
  await expect(page.locator('#compareRoundedLine')).toHaveText('y = 3.00 + 0.50x');
  await expect(page.locator('#compareRoundedLine').locator('..')).toContainText('(2 decimal places); actual fitted coefficients differ');
  await expect(page.locator('#plots svg')).toHaveCount(4);
  if(page.viewportSize().width>=1100)for(const plot of await page.locator('#plots svg').all())await expect(plot).toBeInViewport({ratio:1});
  await page.locator('[data-compare-view="residual"]').click();
  await expect(page.locator('#plots svg[data-view="residual"]')).toHaveCount(4);
  await expect(page.locator('#scaleNote')).toContainText('−4');
  await page.screenshot({path:info.outputPath('fit-comparison.png')});
  await page.keyboard.press('Escape');
  await expect(compare).toBeFocused();
  await expect(page.locator('button[data-view="residual"]')).toHaveAttribute('aria-pressed','true');
  await compare.click();
  await expect(page.locator('[data-compare-view="residual"]')).toHaveAttribute('aria-pressed','true');
  await check();
});

test('@desktop @mobile @reduced SHADOW separates the exterior turn and cavity witness',async({page},info)=>{
  const check=await watch(page);
  await page.goto('/series/same-shadow-2.html');
  await page.getByRole('button',{name:'Turn the body',exact:true}).click();
  await expect(page.locator('#statView')).toHaveText('OFF');
  await page.getByRole('button',{name:'Inspect cavity',exact:true}).click();
  await expect(page.locator('#methodName')).toHaveText('Well');
  await expect(page.locator('#statRay')).toHaveText('2 spans');
  await expect(page.locator('#statMask')).toHaveText('0 px');
  await expect(page.locator('#usePlate')).toBeFocused();
  await expect(page.locator('#usePlate')).toBeInViewport();
  await expect(page.locator('#depthExplanation')).toBeVisible();
  await expect(page.locator('#depthExplanation')).toContainText('two occupied intervals separated by an enclosed cavity');
  await page.screenshot({path:info.outputPath('shadow-cavity.png')});
  await page.locator('#faceBtn').click();
  await expect(page.locator('#statView')).toHaveText('FACE');
  await expect(page.locator('#statMask')).toHaveText('0 px');
  await page.locator('[data-method="prism"]').click();
  await expect(page.locator('#depthExplanation')).toBeHidden();
  await check();
});

test('@desktop @mobile collection continuation and explicit URLs override the saved view',async({page})=>{
  await page.goto('/series/');
  await page.getByRole('button',{name:'All twenty studies →'}).click();
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await expect(page.locator('.card[data-file="same-earth.html"]')).toBeFocused();
  await expect(page).toHaveURL(/#all$/);
  await page.goto('/series/#start');
  await expect(page.locator('.card:visible')).toHaveCount(6);
  await page.goto('/series/#all');
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await page.goto('/series/#start');
  await page.locator('.card:visible').first().focus();
  await page.keyboard.press('3');
  await expect(page).toHaveURL(/same-sites3\.html$/);
});

test('@desktop collection navigation still works when session storage is unavailable',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
  const check=await watch(page);
  await page.goto('/series/');
  await expect(page.locator('.card:visible')).toHaveCount(6);
  await page.getByRole('button',{name:'All twenty studies →'}).click();
  await page.reload();
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await check();
});

test('@desktop VOLUME keeps its unfinished primary worker through appendix visits',async({page})=>{
  const check=await watch(page),primary=[];
  page.on('worker',worker=>{if(worker.url().endsWith('/volume-obligations.worker.js'))primary.push(worker);});
  await page.goto('/series/same-volume-series-pass.html');
  await expect(page.locator('#methodPending')).toContainText('Solving');
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#methodPending')).toContainText('background');
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#study-title')).toHaveText('SAME VOLUME');
  expect(primary).toHaveLength(1);
  // Finish while in the appendix: its loader/readout must retain their own state.
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#methodPending')).toContainText('All three VOLUME designs are kept',{timeout:100_000});
  await expect(page.locator('#study-title')).toHaveText('SAME FRACTION');
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#methodPending')).toContainText('All three runs complete.');
  await expect(page.locator('#statV')).toHaveText(/^0\.400\d{5}$/);
  await expect(page.locator('#loader')).toHaveAttribute('aria-hidden','true');
  expect(primary).toHaveLength(1);
  await check();
});

test('@desktop collection remains complete without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4173/series/');
  await expect(page.locator('.card:visible')).toHaveCount(20);
  await expect(page.locator('.collection-choices')).toBeHidden();
  await context.close();
});

test('@desktop VOLUME reports a primary failure during an appendix visit without replacing the appendix',async({page})=>{
  await page.route('**/volume-obligations.worker.js',route=>route.fulfill({
    contentType:'text/javascript',body:'onmessage=()=>setTimeout(()=>{throw new Error("Injected primary worker failure")},3000);'
  }));
  await page.goto('/series/same-volume-series-pass.html');
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#methodPending')).toContainText('background');
  await expect(page.locator('#methodPending')).toContainText('Primary solve interrupted');
  await expect(page.locator('#study-title')).toHaveText('SAME FRACTION');
  await expect(page.locator('#fallback')).toBeHidden();
  await page.locator('#studyModeBtn').click();
  await expect(page.locator('#methodPending')).toContainText('Solve interrupted');
  await expect(page.locator('#fallback')).toBeVisible();
  await expect(page.locator('#loader')).toHaveAttribute('aria-hidden','true');
});
