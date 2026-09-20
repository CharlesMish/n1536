import {expect,test} from '@playwright/test';

const studies=[['same-distances','SAME DISTANCES'],['same-residual','SAME RESIDUAL'],['same-fit','SAME FIT']];
async function monitor(page){
 const errors=[];
 await page.addInitScript(()=>{window.studyCsp=[];document.addEventListener('securitypolicyviolation',e=>window.studyCsp.push(e.effectiveDirective+': '+e.blockedURI));});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 return async()=>{expect(errors).toEqual([]);expect(await page.evaluate(()=>window.studyCsp)).toEqual([])};
}
for(const [slug,title] of studies)test(`@desktop @mobile @reduced ${title} renders and exposes its study under CSP`,async({page})=>{
 const check=await monitor(page);await page.goto(`/series/${slug}.html`);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 const initial=await page.locator('html').getAttribute('data-theme');
 await page.locator('#theme').click();
 expect(await page.locator('html').getAttribute('data-theme')).not.toEqual(initial);
 await page.locator('#theme').click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
 await page.locator('#study-notes > summary').click();
 await expect(page.getByText('Read the study',{exact:true}).locator('..')).toHaveAttribute('open','');
 await check();
});

test('@desktop FIT keeps four computed views and exposes the rounding differences',async({page})=>{
 const check=await monitor(page);await page.goto('/series/same-fit.html');
 await expect(page.locator('#plots svg')).toHaveCount(4);
 await expect(page.locator('#roundedLine')).toContainText('3.00');
 await expect(page.locator('#roundedLine')).toContainText('0.50');
 const summary=await page.locator('#sharedSummary').textContent();
 await page.locator('#study-notes > summary').click();
 await page.locator('#inspectIII').click();
 await expect(page.locator('#row')).toHaveValue('3');
 await expect(page.locator('#reading2')).toContainText('12.74');
 await page.locator('button[data-view="residual"]').click();
 await expect(page.locator('button[data-view="residual"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#scaleNote')).toContainText('−4');
 await expect(page.locator('#sharedSummary')).toHaveText(summary);
 await page.locator('#inspectIV').click();
 await expect(page.locator('#row')).toHaveValue('8');
 await expect(page.locator('#reading3')).toContainText('19');
 await page.locator('#row').focus();await page.keyboard.press('End');
 await expect(page.locator('#row')).toHaveValue('11');
 await page.locator('#audit > summary').click();
 await expect(page.locator('#auditBody')).toContainText('4.122620');
 await expect(page.locator('#auditBody')).toContainText('4.127269');
 await check();
});

test('@desktop RESIDUAL changes actual error while its norm and bound remain fixed',async({page})=>{
 const check=await monitor(page);await page.goto('/series/same-residual.html');
 await page.locator('[data-angle="0"]').click();
 await expect(page.locator('#residualNorm')).toHaveText('1.000000');
 await expect(page.locator('#relativeResidual')).toHaveText('1.000%');
 await expect(page.locator('#amplification')).toHaveText('1.000×');
 await expect(page.locator('#errorNorm')).toHaveText('0.010000');
 await page.locator('[data-angle="90"]').click();
 await expect(page.locator('#amplification')).toHaveText('100.000×');
 await expect(page.locator('#errorNorm')).toHaveText('1.000000');
 await expect(page.locator('#relativeError')).toHaveText('100.000%');
 await expect(page.locator('#residualNorm')).toHaveText('1.000000');
 await expect(page.locator('#errorBound')).toHaveText('100.000%');
 await page.locator('#angle').focus();await page.keyboard.press('Home');
 await expect(page.locator('#angle')).toHaveValue('0');
 await expect(page.locator('#amplification')).toHaveText('1.000×');
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('#angle')).toHaveValue('1');
 await expect(page.locator('#amplification')).not.toHaveText('1.000×');
 await check();
});

test('@desktop DISTANCES separates the proper-fit bound from reflection and preserves edge lengths',async({page})=>{
 const check=await monitor(page);await page.goto('/series/same-distances.html');
 await expect(page.locator('#distanceRows tr')).toHaveCount(6);
 await expect(page.locator('#distanceAudit')).toContainText('6 / 6');
 await page.locator('#bestFit').click();
 await expect(page.locator('#currentRms')).toHaveText(/^1\.0+$/);
 await expect(page.locator('#bestRms')).toHaveText(/^1\.0+ units$/);
 const targetVolume=await page.locator('#targetVolume').textContent();
 expect(await page.locator('#sourceVolume').textContent()).not.toEqual(targetVolume);
 await page.locator('#reflect').click();
 await expect(page.locator('#reflect')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#currentRms')).toHaveText(/^0\.0+$/);
 await expect(page.locator('#sourceVolume')).toHaveText(targetVolume);
 await expect(page.locator('#bestRms')).toHaveText(/^1\.0+ units$/);
 await page.locator('#bestFit').click();
 await page.locator('#rotateY').focus();await page.keyboard.press('ArrowRight');
 await expect(page.locator('#rotateY')).not.toHaveValue('0');
 await expect(page.locator('#distanceAudit')).toContainText('6 / 6');
 expect(Number(await page.locator('#currentRms').textContent())).toBeGreaterThanOrEqual(1);
 await page.locator('#orientationField').focus();
 const angle=await page.locator('#rotateY').inputValue();
 await page.keyboard.press('ArrowRight');
 await expect(page.locator('#rotateY')).not.toHaveValue(angle);
 await expect(page.locator('#distanceAudit')).toContainText('6 / 6');
 await check();
});
