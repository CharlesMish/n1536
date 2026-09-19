import { expect, test } from '@playwright/test';

async function monitor(page) {
  const failures=[];
  await page.addInitScript(()=>{
    window.seriesCspViolations=[];
    document.addEventListener('securitypolicyviolation',e=>window.seriesCspViolations.push(e.effectiveDirective+': '+e.blockedURI));
  });
  page.on('pageerror',e=>failures.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
  return async()=>{expect(failures).toEqual([]);expect(await page.evaluate(()=>window.seriesCspViolations)).toEqual([]);};
}

test('@desktop series index, book and canonical N link together',async({page})=>{
  const check=await monitor(page);
  await page.goto('/series/index.html');
  await expect(page.locator('.card')).toHaveCount(18);
  await expect(page.locator('.card').first()).toContainText('Field study 01');
  await expect(page.locator('.card').last()).toContainText('Field study 18');
  await check();
  await page.getByRole('link',{name:'book of plates →',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/series\/plates\.html$/);
  await expect(page.locator('.spread')).toHaveCount(18);
  await check();
  await page.goto('/series/same-n.html');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading',{name:'SAME N',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Back to SAME series',exact:true}).click();
  await expect(page.locator('.card')).toHaveCount(18);
  await check();
});

for(const [file,title] of [
 ['same-earth','SAME EARTH'],['same-sites3','SAME SITES'],['same-shadow-2','SAME SHADOW'],
 ['same-samples-2','SAME SAMPLES'],['same-marginals-2','SAME MARGINALS'],['same-magnitude-2','SAME MAGNITUDE']
])test(`@desktop ${title} initializes and opens its explanation under CSP`,async({page})=>{
 const check=await monitor(page);await page.goto(`/series/${file}.html`);
 await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Read the study',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await check();
});

test('@desktop Average regrouping preserves counts and sets visible bar widths',async({page})=>{
 const check=await monitor(page);await page.goto('/series/same-average.html');
 await page.getByRole('button',{name:'03 Reverse',exact:true}).click();
 await expect(page.locator('#claim')).toHaveText('B leads within both groups.');
 await expect(page.locator('#auditRows')).toContainText('120');
 expect(await page.locator('#groups .bar i').evaluateAll(nodes=>nodes.map(n=>n.style.width))).toEqual(['70%','80%','20%','30%']);
 await page.getByText('Follow the same 400 records',{exact:true}).click();
 await expect(page.locator('#recordFields svg title')).toHaveCount(400);
 await check();
});

test('@desktop LAW plays and restarts exact histories',async({page})=>{
 const check=await monitor(page);await page.goto('/series/same-law.html');
 await expect(page.locator('#time')).toHaveValue('32');
 await page.getByRole('button',{name:'Restart',exact:true}).click();
 await expect(page.locator('#time')).toHaveValue('0');
 await page.getByRole('button',{name:'Play',exact:true}).click();
 await expect.poll(()=>page.locator('#time').inputValue()).not.toBe('0');
 await page.getByRole('button',{name:'Pause',exact:true}).click();
 await expect(page.locator('#orbits svg')).toHaveCount(3);await check();
});

test('@desktop Volume finishes using external same-origin workers',async({page})=>{
 const check=await monitor(page);const workers=[];page.on('worker',w=>workers.push(w.url()));
 await page.goto('/series/same-volume-series-pass.html');
 await expect(page.locator('#live')).toContainText('Three obligation fields completed',{timeout:100_000});
 await expect(page.locator('#statV')).toHaveText(/^0\.400\d{5}$/);
 expect(workers.some(url=>url.endsWith('/series/assets/volume-obligations.worker.js'))).toBeTruthy();
 expect(workers.every(url=>url.startsWith('http://127.0.0.1:4173/series/assets/'))).toBeTruthy();
 await check();
});
