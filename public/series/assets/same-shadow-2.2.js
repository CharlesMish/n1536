

(() => {
 const app=document.getElementById('app'),stage=document.getElementById('stage');
 const guide=["A silhouette cannot determine an interior.", "Binary occupancy under the named orthographic −Z projection.", "The occupied depth intervals behind each point in the mask.", "Switch between Prism, Grade, and Well while Face is active. Then turn the body. Inspect the ray figure to see Well’s enclosed cavity.", "Mask Δ compares the canonical occupancy functions at 256² ray locations, not the colors of the shaded rendering. Volume is a numerical integral in unit coordinates. Ray counts occupied depth intervals at the selected (x,y). The 64² box rendering is a tessellated approximation. Well has an enclosed cavity: its exterior can hide the missing material from rotated views too. The ray figure directly shows that interior; the shading is not an X-ray."];
 const dialog=document.createElement('dialog');dialog.className='study-dialog';dialog.setAttribute('aria-labelledby','reading-title');
 dialog.innerHTML=`<button class="close-reading" type="button" aria-label="Close study explanation">Close</button><h2 id="reading-title">${guide[0]}</h2><h3>What stays the same</h3><p>${guide[1]}</p><h3>What changes</h3><p>${guide[2]}</p><h3>Try this</h3><p>${guide[3]}</p><h3>Reading the measurements</h3><p>${guide[4]}</p><h3>Selected state</h3><div class="focus-values"></div><canvas class="reading-figure" aria-label="Snapshot of the selected inspection figure"></canvas><p>The inspection figure and values above are captured when this explanation opens.</p><details><summary>Construction notes</summary><p class="construction"></p></details>`;
 app.append(dialog);
 const button=document.createElement('button');button.type='button';button.className='read-study';button.textContent='Read the study';button.setAttribute('aria-haspopup','dialog');
 const mountButton=()=>{const tools=document.querySelector('.study-tools');if(tools&&!tools.contains(button))tools.append(button);};mountButton();
 // Volume rebuilds its control bar when entering the appendix.
 new MutationObserver(mountButton).observe(document.querySelector('.study-tools'),{childList:true});
 button.addEventListener('click',()=>{
   dialog.querySelector('.focus-values').textContent=document.querySelector('.method-reading').innerText;
   const note=document.getElementById('method-limitations');dialog.querySelector('.construction').textContent=note?note.textContent.trim():guide[4];
   const source=document.getElementById('plate'),target=dialog.querySelector('canvas');target.width=source.width;target.height=source.height;target.getContext('2d').drawImage(source,0,0);
   dialog.showModal();dialog.querySelector('.close-reading').focus();
 });
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

