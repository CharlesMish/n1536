const Q=1n<<40n;
const mod=x=>(x%Q+Q)%Q;
function step([x,y]){return [mod(2n*x+y),mod(x+y)];}
function inverse([x,y]){return [mod(x-y),mod(-x+2n*y)];}
function trajectories(bits=40,steps=80){const d=1n<<BigInt(40-bits),base=[Q/8n,Q/5n];return [base,[base[0]+d,base[1]],[base[0],base[1]+d]].map(p=>{const a=[p];for(let i=0;i<steps;i++)a.push(step(a.at(-1)));return a;});}
function distance(a,b){return Math.hypot(...a.map((x,i)=>{let d=mod(x-b[i]);if(d>Q/2n)d=Q-d;return Number(d)/Number(Q);}));}
const GROUPS=[
 {id:'agree',name:'Agree',claim:'A leads within both groups.',explain:'The two categories have the same group composition. Each within-group difference agrees with the pooled difference.',cells:[[[80,100],[60,100]],[[40,100],[20,100]]]},
 {id:'disappear',name:'Disappear',claim:'The difference vanishes within each group.',explain:'Within-group rates match exactly. A has more records in the group with the higher success rate, which creates the pooled difference.',cells:[[[105,140],[45,60]],[[15,60],[35,140]]]},
 {id:'reverse',name:'Reverse',claim:'B leads within both groups.',explain:'B is ten percentage points ahead in each group. A still leads overall because it has many more records in the group with the higher success rate.',cells:[[[112,160],[32,40]],[[8,40],[48,160]]]}
];
function records(state){return [0,1].flatMap(c=>{const successes=c===0?120:80,first=state.cells[0][c],failFirst=first[1]-first[0];return Array.from({length:200},(_,i)=>({id:(c===0?'A':'B')+String(i+1).padStart(3,'0'),category:c,success:i<successes,group:i<successes?(i<first[0]?0:1):(i-successes<failFirst?0:1)}));});}

function torusSVG(path,t,color='var(--accent)',label='Trajectory'){
 const n=Number(Q),to=p=>[24+Number(p[0])/n*208,232-Number(p[1])/n*208];let out=`<svg viewBox="0 0 256 256" role="img" aria-label="${label}, step ${t}. Dots are successive discrete states."><rect x="24" y="24" width="208" height="208" fill="none" stroke="var(--rule)"/>`;
 for(let k=1;k<4;k++)out+=`<path d="M${24+k*52} 24V232 M24 ${24+k*52}H232" stroke="var(--grid)" fill="none"/>`;
 out+=`<g fill="var(--faint)" font-size="10"><text x="18" y="247">0</text><text x="225" y="247">1</text><text x="9" y="30">1</text><text x="122" y="247">x</text><text x="8" y="128">y</text></g>`;
 for(let i=Math.max(0,t-12);i<=t;i++){const [x,y]=to(path[i]);out+=`<circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${i===t?5:2.5}" fill="${color}" opacity="${i===t?1:(.15+.5*(i-Math.max(0,t-12))/13).toFixed(3)}"/>`;}
 const [x,y]=to(path[t]);out+=`<circle cx="${x}" cy="${y}" r="9" fill="none" stroke="${color}" opacity=".65"/>`;return out+'</svg>';
}
function distanceSVG(paths,t=32){let s='<svg viewBox="0 0 920 230" role="img" aria-label="Distance from A on a logarithmic scale, over steps zero to eighty"><g fill="var(--faint)" font-size="12">';const x=i=>65+i*10.2,y=d=>194-(Math.max(-13,Math.min(0,Math.log10(d)))+13)/13*164;
 for(const e of [-12,-8,-4,0])s+=`<text x="8" y="${y(10**e)+4}">10<tspan dy="-5" font-size="9">${e}</tspan></text><path d="M65 ${y(10**e)}H881" stroke="var(--grid)"/>`;
 for(const i of [0,20,40,60,80])s+=`<text x="${x(i)-6}" y="217">${i}</text>`;s+='</g>';
 for(const j of [1,2]){const d=paths[0].slice(0,t+1).map((p,i)=>`${i?'L':'M'}${x(i).toFixed(2)} ${y(distance(p,paths[j][i])).toFixed(2)}`).join(' ');s+=`<path d="${d}" stroke="${j===1?'var(--summary)':'var(--warm)'}" ${j===2?'stroke-dasharray="5 4"':''} stroke-width="2" fill="none"/>`;}
 s+=`<path d="M${x(t)} 24V194" stroke="var(--faint)" stroke-dasharray="3 5"/><text x="815" y="16" fill="var(--faint)" font-size="12">step →</text>`;return s+'</svg>';
}
function averageSpecimen(state){let s='<svg viewBox="0 0 600 300" role="img" aria-label="Reversal: A leads pooled sixty to forty percent; B leads within both groups"><g font-size="14" fill="var(--ink)">';const rows=[['Pooled',[[120,200],[80,200]]],['Group 1',state.cells[0]],['Group 2',state.cells[1]]];for(let i=0;i<3;i++){const y=32+i*88;s+=`<text x="18" y="${y}">${rows[i][0]}</text>`;for(let c=0;c<2;c++){const [k,n]=rows[i][1][c],yy=y+9+c*25;s+=`<text x="130" y="${yy+12}" fill="${c?'var(--summary)':'var(--accent)'}">${c?'B':'A'}</text><rect x="151" y="${yy}" width="290" height="13" fill="var(--grid)"/><rect x="151" y="${yy}" width="${290*k/n}" height="13" fill="${c?'var(--summary)':'var(--accent)'}"/><text x="452" y="${yy+12}">${Math.round(100*k/n)}% · ${k}/${n}</text>`;}}return s+'</g></svg>';}

const themeButton=document.getElementById('theme');
function setTheme(value){document.documentElement.dataset.theme=value;themeButton.textContent=value==='uv'?'Paper':'UV';themeButton.setAttribute('aria-label','Switch to '+(value==='uv'?'Paper':'UV')+' presentation');try{localStorage.setItem('same-reading-theme',value);}catch{}}
let saved='uv';try{saved=localStorage.getItem('same-reading-theme')||'uv';}catch{}setTheme(saved==='paper'?'paper':'uv');themeButton.addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='paper'?'uv':'paper'));

let selected=0;
const $=id=>document.getElementById(id);
const pct=(k,n)=>100*k/n;
function showAverage(){const state=GROUPS[selected],rr=records(state);$('claim').textContent=state.claim;$('explanation').textContent=state.explain;
 $('groups').innerHTML=state.cells.map((cells,g)=>{const delta=pct(...cells[0])-pct(...cells[1]);return `<section class="group"><div class="group-head"><h3>Group ${g+1}</h3><span>${Math.abs(delta)<1e-9?'Equal rates':(delta>0?'A':'B')+' +'+Math.abs(delta).toFixed(0)+' percentage points'}</span></div>${cells.map(([k,n],c)=>`<div class="rate-row category-${c}"><span>${c?'B':'A'}</span><div class="bar" aria-hidden="true"><i data-rate="${pct(k,n)}"></i></div><strong>${pct(k,n).toFixed(0)}%<small>${k} / ${n}</small></strong></div>`).join('')}<div class="weights"><p>Share of all A records: ${pct(cells[0][1],200)}%</p><p>Share of all B records: ${pct(cells[1][1],200)}%</p></div></section>`;}).join('');
 document.querySelectorAll('[data-rate]').forEach(el=>{el.style.width=Number(el.dataset.rate)+'%';});
 $('weights').innerHTML=[0,1].map(c=>{const a=state.cells[0][c],b=state.cells[1][c];return `<p class="mathematics">${c?'B':'A'}: ${pct(a[1],200)}% × ${pct(...a)}% + ${pct(b[1],200)}% × ${pct(...b)}% = ${c?40:60}%</p>`;}).join('');
 $('recordFields').innerHTML=[0,1].map(c=>`<figure class="spec"><h3>${c?'B':'A'} · 200 fixed records</h3><svg class="record-field" viewBox="0 0 400 205" role="img" aria-label="Two hundred fixed ${c?'B':'A'} records. Shape indicates current group; fill indicates success.">${rr.filter(r=>r.category===c).map((r,i)=>{const x=10+(i%20)*20,y=12+Math.floor(i/20)*20,color=c?'var(--summary)':'var(--accent)',attrs=`fill="${r.success?color:'none'}" stroke="${color}" stroke-width="1.5"`,title=`<title>${r.id}: ${r.success?'success':'failure'}, group ${r.group+1}</title>`;return r.group===0?`<rect x="${x-5}" y="${y-5}" width="10" height="10" ${attrs}>${title}</rect>`:`<circle cx="${x}" cy="${y}" r="5" ${attrs}>${title}</circle>`;}).join('')}</svg></figure>`).join('');
 $('auditRows').innerHTML=state.cells.flatMap((cells,g)=>cells.map(([k,n],c)=>`<tr><td>Group ${g+1} · ${c?'B':'A'}</td><td>${k}</td><td>${n-k}</td><td>${n}</td><td>${pct(k,n)}%</td></tr>`)).join('')+'<tr><td>Pooled · A</td><td>120</td><td>80</td><td>200</td><td>60%</td></tr><tr><td>Pooled · B</td><td>80</td><td>120</td><td>200</td><td>40%</td></tr>';
 document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.state)===selected)));
 $('announcement').textContent=state.name+'. '+state.claim+' Pooled rates remain A sixty percent, B forty percent.';
}
document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{selected=Number(b.dataset.state);showAverage();}));
showAverage();
