

(() => {
 const app=document.getElementById('app'),stage=document.getElementById('stage');
 const dialog=document.createElement('dialog');dialog.className='study-dialog';dialog.setAttribute('aria-labelledby','reading-title');
 dialog.innerHTML=`<button class="close-reading" type="button" aria-label="Close study explanation">Close</button>
 <h2 id="reading-title">Three pictures share one magnitude map</h2>
 <p>Find the moth’s wings in Source, then the violin’s waist in Borrowed. All three pictures are sums of repeating stripes at many spacings and angles. The moth supplies the strength of each stripe pattern. Its phase sets where that pattern’s crests fall. Changing their alignment changes where edges appear in the sum.</p>
 <div class="reading-triptych" role="group" aria-label="Three reconstructions on one grayscale">
   <figure class="reading-plate"><img src="./assets/specimen-09-source.png" width="128" height="128" alt="Reconstruction of a moth with open wings"><figcaption><strong>Source.</strong> The moth supplies both strength and phase.</figcaption></figure>
   <figure class="reading-plate"><img src="./assets/specimen-09-borrowed.png" width="128" height="128" alt="Violin-shaped reconstruction made with the moth’s Fourier magnitudes"><figcaption><strong>Borrowed.</strong> Violin phases line up the moth’s components in the shape of the instrument.</figcaption></figure>
   <figure class="reading-plate"><img src="./assets/specimen-09-scrambled.png" width="128" height="128" alt="Grainy field with neither object recognizable"><figcaption><strong>Scrambled.</strong> A fixed seed chooses the phases. Returning here reproduces the same grain.</figcaption></figure>
 </div>
 <h3>Two maps of the same frequency grid</h3>
 <p>The left map shows the strength of each stripe pattern on a logarithmic scale, which makes weak patterns visible alongside strong ones. The center holds the constant component that sets the mean brightness. Moving outward reaches finer stripes. The right map uses hue for phase.</p>
 <canvas class="reading-figure" aria-label="Selected spectrum with magnitude and phase maps and the inspected frequency bin"></canvas>
 <p>Both little outlines pick the same frequency. On the exhibit, click a cell away from the center of either map and switch cases. The bin coordinates and magnitude stay fixed while its phase angle can change. The separate <em>cell</em> readout gives a pixel in the reconstructed picture; each pixel combines all the bins.</p>
 <h3>Checks on the reconstruction</h3>
 <div class="focus-values"></div>
 <p><b>|F| Δ</b> reports the largest magnitude discrepancy relative to the largest source magnitude. <b>Im</b> measures the tiny imaginary part left by numerical inversion. Opposite frequencies are paired so the resulting picture is real. <b>Parseval</b> compares two ways of adding up energy, in the picture and in its spectrum; their ratio should be one. A common grayscale lets you compare the three pictures directly.</p>
 <details><summary>Construction notes</summary><p class="construction"></p></details>`;
 app.append(dialog);
 const button=document.createElement('button');button.type='button';button.className='read-study';button.textContent='Read the study';button.setAttribute('aria-haspopup','dialog');
 const mountButton=()=>{const tools=document.querySelector('.study-tools');if(tools&&!tools.contains(button))tools.append(button);};mountButton();
 // Volume rebuilds its control bar when entering the appendix.
 new MutationObserver(mountButton).observe(document.querySelector('.study-tools'),{childList:true});
 button.addEventListener('click',()=>{
   dialog.querySelector('.focus-values').textContent=document.querySelector('.method-reading').innerText;
   const note=document.getElementById('method-limitations');dialog.querySelector('.construction').textContent=note?note.textContent.trim():"";
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

