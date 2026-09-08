

(() => {
 const app=document.getElementById('app'),stage=document.getElementById('stage');
 const guide=["A common budget answers different obligations.", "The domain, supports, loads, heat source, heat sink, and target mean physical density of 0.40.", "Which objective the material allocation serves.", "Compare Carry, Conduct, and Share. A ratio of 1 is the corresponding specialist reference; larger compliance is worse for that objective.", "Mech / ref compares mechanical compliance to Carry. Therm / ref compares thermal compliance to Conduct. Share minimizes a fixed 50/50 sum of these normalized objectives. Gray is mean 4ρ(1−ρ), not a convergence score. Load and Heat overlays use separate within-design scales; their colors do not compare absolute magnitudes between designs. Mean ρ is the achieved mean density, shown to eight decimals. The common target is 0.40; equality is enforced numerically, not exactly. A finished run is a local SIMP result, not a certified optimum. The structural appendix changes the structural case and preserves a designable fraction, a different comparison from the primary exhibit."];
 const dialog=document.createElement('dialog');dialog.className='study-dialog';dialog.setAttribute('aria-labelledby','reading-title');
 dialog.innerHTML=`<button class="close-reading" type="button" aria-label="Close study explanation">Close</button><h2 id="reading-title">${guide[0]}</h2><h3>What stays the same</h3><p>${guide[1]}</p><h3>What changes</h3><p>${guide[2]}</p><h3>Try this</h3><p>${guide[3]}</p><h3>Reading the measurements</h3><p>${guide[4]}</p><h3>Selected state</h3><div class="focus-values"></div><canvas class="reading-figure" aria-label="Snapshot of the selected inspection figure"></canvas><p>The inspection figure and values above are captured when this explanation opens.</p><details><summary>Construction notes</summary><p class="construction"></p></details>`;
 app.append(dialog);
 const button=document.createElement('button');button.type='button';button.className='read-study';button.textContent='Read the study';button.setAttribute('aria-haspopup','dialog');
 const mountButton=()=>{const tools=document.querySelector('.study-tools');if(tools&&!tools.contains(button))tools.append(button);};mountButton();
 // Volume rebuilds its control bar when entering the appendix.
 new MutationObserver(mountButton).observe(document.querySelector('.study-tools'),{childList:true});
 button.addEventListener('click',()=>{
   const currentGuide=document.getElementById('study-title').textContent==='SAME FRACTION' ? [
     'A common designable fraction serves different structures.',
     'The target mean physical density of 0.40 over each designable field, the SIMP penalty, and the filter radius measured in element lengths.',
     'The domain, mesh, supports, and load. Each case is a separate structural problem.',
     'Compare Cantilever, MBB, and L-bracket to see where each structure needs material. Inspect a cell, then toggle Energy or Deflect.',
     'C/C₀ compares compliance only to the current case’s uniform-density start; it is not a cross-case ranking. Energy colors are normalized within the current field and displacement is independently exaggerated. Mean ρ is the achieved mean density, shown to eight decimals. The common target is 0.40; equality is enforced numerically, not exactly. Gray is mean 4ρ(1−ρ), not a convergence score. Iter is the completed iteration count. These are local explanatory SIMP results, not certified optima.'
   ] : guide;
   dialog.querySelector('h2').textContent=currentGuide[0];
   dialog.querySelectorAll(':scope > h3 + p').forEach((p,i)=>p.textContent=currentGuide[i+1]);
   dialog.querySelector('.focus-values').textContent=document.querySelector('.method-reading').innerText;
   const note=document.getElementById('method-limitations');dialog.querySelector('.construction').textContent=note?note.textContent.trim():guide[4];
   const source=document.getElementById('plate'),target=dialog.querySelector('canvas');target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);
   dialog.showModal();dialog.querySelector('.close-reading').focus();
 });
 dialog.querySelector('.close-reading').addEventListener('click',()=>dialog.close());
 // Native document shortcuts should not change the scene beneath an open dialog.
 window.addEventListener('keydown',e=>{if(dialog.open)e.stopImmediatePropagation();},{capture:true});
 const heading=document.createElement('div');heading.className='mobile-heading';
 const flow=document.createElement('div');flow.className='mobile-flow';
 const topNodes=[document.querySelector('.study-header'),document.querySelector('.theme-switch')];
 const flowNodes=['.method-nav','.study-tools','.method-reading','.field-keys','.use-plate'].map(s=>document.querySelector(s)).filter(Boolean);
 const homes=new Map();for(const n of [...topNodes,...flowNodes]){const marker=document.createComment('responsive home');n.before(marker);homes.set(n,marker);}
 const mq=matchMedia('(max-width:700px)');
 const layout=()=>{
   document.documentElement.classList.toggle('mobile-reading',mq.matches);
   if(mq.matches){app.insertBefore(heading,stage);stage.after(flow);for(const n of topNodes)heading.append(n);for(const n of flowNodes)flow.append(n);}
   else {for(const [n,marker] of homes)marker.after(n);heading.remove();flow.remove();}
   window.dispatchEvent(new Event('resize'));
 };
 mq.addEventListener('change',layout);layout();
})();

