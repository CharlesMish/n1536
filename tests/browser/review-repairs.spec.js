import { expect, test } from '@playwright/test';

async function monitor(page) {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
  await page.addInitScript(()=>{
    window.reviewCsp=[];
    document.addEventListener('securitypolicyviolation',e=>window.reviewCsp.push(e.effectiveDirective));
  });
  return async()=>{expect(errors).toEqual([]);expect(await page.evaluate(()=>window.reviewCsp)).toEqual([])};
}

// Control worker delivery so the UI is tested between specialist completions,
// not just after the real solver has finished everything. The real solver retains
// its separate end-to-end test in series.spec.js.
async function controlledVolume(page) {
  await page.addInitScript(()=>{
    const Original=window.Worker;
    window.Worker=class extends EventTarget {
      constructor(url,...rest) {
        super();
        if(!String(url).endsWith('volume-obligations.worker.js'))return new Original(url,...rest);
        window.volumeWorker=this;
      }
      postMessage(message){this.requestId=message.requestId;setTimeout(()=>this.send('carry',0,false),0)}
      terminate(){this.terminated=true}
      field(claim,iter,settled){
        return {type:'state',requestId:this.requestId,claim,iter,settled,nelx:56,nely:28,
          rho:new Float32Array(56*28).fill(.4),ceM:new Float32Array(56*28).fill(1),ceT:new Float32Array(56*28).fill(1),
          U:new Float32Array(57*29*2),T:new Float32Array(57*29),vol:.4,gray:.96,Cm:claim==='carry'?10:30,Ct:claim==='conduct'?20:40};
      }
      send(claim,iter,settled){this.onmessage({data:this.field(claim,iter,settled)})}
      finish(){this.onmessage({data:{type:'done',requestId:this.requestId,CmStar:10,CtStar:20,
        fields:Object.fromEntries(['carry','conduct','share'].map(k=>[k,this.field(k,40,true)]))}})}
    };
  });
}

async function paintedBounds(page) {
  return page.locator('#field').evaluate(canvas=>{
    const {width:w,height:h}=canvas, data=canvas.getContext('2d').getImageData(0,0,w,h).data;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y+=2)for(let x=0;x<w;x+=2)if(data[(y*w+x)*4+3]>25){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
    const b=canvas.getBoundingClientRect();
    return {left:b.x+x0*b.width/w,top:b.y+y0*b.height/h,right:b.x+x1*b.width/w,bottom:b.y+y1*b.height/h,width:(x1-x0)*b.width/w};
  });
}

for(const [width,height] of [[1440,900],[1920,780],[1000,700],[390,844]])for(const study of ['samples-2','volume-series-pass']){
  test(`@desktop review repair ${study} separates field and controls at ${width}×${height}`,async({page})=>{
    await page.setViewportSize({width,height});
    const check=await monitor(page);
    if(study==='volume-series-pass')await controlledVolume(page);
    await page.goto(`/series/same-${study}.html`);
    if(study==='volume-series-pass')await expect(page.locator('#statV')).toHaveText('0.40000000');
    await expect.poll(async()=>(await paintedBounds(page)).width).toBeGreaterThan(width<1100?width*.6:Math.min(width*.3,height*.6));
    for(const theme of ['uv','paper']){
      if(theme==='paper')await page.locator('#themeBtn').click();
      const field=await paintedBounds(page), header=await page.locator('.study-header').boundingBox();
      expect(field.top).toBeGreaterThan(header.y+header.height+10);
      expect(field.left).toBeGreaterThanOrEqual(0);
      expect(field.right).toBeLessThanOrEqual(width);
      if(width>=1100){
        const tools=await page.locator('.study-tools').boundingBox();
        const reading=await page.locator('.method-reading').boundingBox();
        const inset=await page.locator('.use-plate').boundingBox();
        expect(field.bottom).toBeLessThan(tools.y-10);
        expect(field.right).toBeLessThan(reading.x-10);
        expect(field.left).toBeGreaterThan(inset.x+inset.width+10);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
    }
    await page.getByRole('button',{name:'Read the study',exact:true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await check();
  });
}

test('@desktop SAMPLES separates influence from measured reconstruction and gates transition statistics',async({page})=>{
  const check=await monitor(page);
  await page.goto('/series/same-samples-2.html');
  await expect(page.locator('#statSpan')).toHaveText('1.46');
  const figure=()=>page.locator('#field').evaluate(c=>c.toDataURL());
  const before=await figure();
  await page.locator('#basisBtn').click();
  await expect(page.locator('#usePlate')).toBeHidden();
  expect(await figure()).toBe(before);
  await page.locator('#basisBtn').click();
  await expect(page.locator('#usePlate')).toBeVisible();
  expect(await figure()).toBe(before);
  await page.locator('[data-method="local"]').click();
  await expect(page.locator('#statSpan')).toHaveText('—');
  await expect(page.locator('#measurementScope')).toContainText('Crossfading');
  await expect(page.locator('#statSpan')).toHaveText('1.36');
  await page.locator('[data-method="periodic"]').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#statSpan')).toHaveText('1.44');
  await expect(page.locator('#measurementScope')).toContainText('fitted curve');
  await check();
});

for(const reducedMotion of ['no-preference','reduce'])test(`@desktop Volume distinguishes selected completion, background solve and reference availability (${reducedMotion})`,async({page})=>{
  const check=await monitor(page);
  await page.emulateMedia({reducedMotion});
  await controlledVolume(page);
  await page.goto('/series/same-volume-series-pass.html');
  await expect(page.locator('#methodPending')).toContainText('intermediate iterate 0');
  await expect(page.locator('#statT')).toHaveText('Waiting for Conduct');
  await page.evaluate(()=>window.volumeWorker.send('carry',40,true));
  await page.evaluate(()=>window.volumeWorker.send('conduct',2,false));
  await expect(page.locator('#methodPending')).toContainText('Carry completed at iteration 40. Solving Conduct, iteration 2.');
  await expect(page.locator('#statM')).toHaveText('1.00');
  await expect(page.locator('#statT')).toHaveText('Waiting for Conduct');
  await page.locator('[data-method="share"]').click();
  await expect(page.locator('#methodPending')).toContainText('Share is waiting to start. Solving Conduct');
  await expect(page.locator('#statV')).toHaveText('—');
  await page.evaluate(()=>window.volumeWorker.send('conduct',40,true));
  await page.evaluate(()=>window.volumeWorker.send('share',2,false));
  await expect(page.locator('#methodPending')).toContainText('Share: intermediate iterate 2');
  await expect(page.locator('#statV')).toHaveText(reducedMotion==='reduce'?'—':'0.40000000');
  await page.evaluate(()=>window.volumeWorker.finish());
  await expect(page.locator('#methodPending')).toContainText('All three runs complete.');
  await expect(page.locator('#statM')).toHaveText('3.00');
  await expect(page.locator('#statT')).toHaveText('2.00');
  await page.locator('[data-method="carry"]').click();
  if(reducedMotion==='no-preference'){
    await expect(page.locator('#methodPending')).toContainText('Presentation transition');
    await expect(page.locator('#statV')).toHaveText('—');
  }
  await expect(page.locator('#methodPending')).toContainText('Carry completed');
  await expect(page.locator('#statM')).toHaveText('1.00');
  await check();
});
