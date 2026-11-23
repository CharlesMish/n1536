(() => {
 const app=document.getElementById('app'),stage=document.getElementById('stage');
 const dialog=document.createElement('dialog');dialog.className='study-dialog';dialog.setAttribute('aria-labelledby','reading-title');
 dialog.innerHTML=`<button class="close-reading" type="button" aria-label="Close study explanation">Close</button>
 <h2 id="reading-title">Where can six moves take you?</h2>
 <p>Stand at the crossing of the axes facing right. Each instruction first turns you in place, then sends you straight ahead along your new heading. In Given the first turn is 120° and its walk is 0.26 units. Reversed starts with a 90° turn and a walk of 0.30 units. The following turns build on whichever heading you now have.</p>
 <figure class="reading-plate">
  <img src="./assets/specimen-11.svg" width="600" height="280" loading="lazy" alt="At full turn scale, two six-leg paths start at the origin and end among 720 dots.">
  <figcaption>At λ = 1 the teal line follows Given and the orange line follows Reversed. Each dot is the final position of one complete ordering. Every walk totals 2.10 units and turns through 360°.</figcaption>
</figure>
 <h3>Exchange just two neighbors</h3>
 <p>The figure below isolates the neighboring moves named beneath its square. Both walks leave the same center. The solid and dashed paths take the two moves in opposite orders. The short dotted connector measures the distance between their endpoints, called <em>Pair gap</em>.</p>
 <canvas class="reading-figure" aria-label="The selected neighboring moves in both orders and the resulting endpoint gap"></canvas>
 <p>After that pair the two headings already agree, because the two turn angles add to the same sum. Every remaining leg can therefore run parallel at exactly the same distance. On the stage, swap a pair and follow the dashed old walk beside the new one: the endpoint gap survives to the sixth leg.</p>
 <h3>What the readouts measure</h3><div class="focus-values"></div>
 <p><b>Length</b> adds all six legs. <b>End</b> gives the coordinates after the sixth. <b>Spread</b> takes the farthest two endpoints among all 720 orderings. The small heading residual measures numerical roundoff against the expected total turn.</p>
 <p>With Trace on, each tiny chevron marks a possible finish and points along its final heading. Move the turn scale λ toward zero. At zero every step goes straight ahead, so every ordering finishes at (2.10, 0). Intermediate values scale the six angles together.</p>
 <details><summary>Construction notes</summary><p class="construction"></p></details>`;
 app.append(dialog);
 const button=document.createElement('button');button.type='button';button.className='read-study';button.textContent='Read the study';button.setAttribute('aria-haspopup','dialog');
 const mountButton=()=>{const tools=document.querySelector('.study-tools');if(tools&&!tools.contains(button))tools.append(button);};mountButton();
 // The study updates its control bar when entering the appendix.
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
 const flowNodes=['.method-nav','.swap-panel','.study-tools','.step-row','.lambda-row','.method-reading','.field-keys','.use-plate'].map(s=>document.querySelector(s)).filter(Boolean);
 const homes=new Map();for(const n of [...topNodes,...flowNodes]){const marker=document.createComment('responsive home');n.before(marker);homes.set(n,marker);}
 const mq=matchMedia('(max-width:1500px), (max-height:800px)');
 const layout=()=>{
   document.documentElement.classList.toggle('mobile-reading',mq.matches);
   if(mq.matches){app.insertBefore(heading,stage);stage.after(flow);for(const n of topNodes)heading.append(n);for(const n of flowNodes)flow.append(n);}
   else {for(const [n,marker] of homes)marker.after(n);heading.remove();flow.remove();}
   window.dispatchEvent(new Event('resize'));
 };
 mq.addEventListener('change',layout);layout();
})();

