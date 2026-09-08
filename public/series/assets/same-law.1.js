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

let bits=40,t=32,paths=trajectories(bits),timer=null;
const $=id=>document.getElementById(id);
function stop(){if(timer!==null)clearInterval(timer);timer=null;$('play').textContent='Play';$('play').setAttribute('aria-pressed','false');}
function drawLaw(){
 const labels=['A · reference','B · x + ε','C · y + ε'],colors=['var(--accent)','var(--summary)','var(--warm)'];
 $('orbits').innerHTML=paths.map((p,j)=>`<figure class="spec trajectory-${j}"><h3>${labels[j]}<span>${j===0?'one frozen start':'one coordinate changed'}</span></h3>${torusSVG(p,t,colors[j],labels[j])}<figcaption class="coordinates">x ${Number(p[t][0])/Number(Q)}<br>y ${Number(p[t][1])/Number(Q)}</figcaption></figure>`).join('');
 $('plot').innerHTML=distanceSVG(paths,t);$('time').value=t;$('timeOut').value=`Step ${String(t).padStart(2,'0')} / 80`;
 $('epsilon').textContent=`2⁻${bits} ≈ ${(2**-bits).toExponential(2)}`;
 $('distanceB').textContent=distance(paths[0][t],paths[1][t]).toExponential(3);
 $('distanceC').textContent=distance(paths[0][t],paths[2][t]).toExponential(3);
 const first=[1,2].map(j=>paths[0].findIndex((p,i)=>distance(p,paths[j][i])>=.1));
 $('horizon').textContent=`B at step ${first[0]} · C at step ${first[1]}`;
 $('currentReading').textContent=t===0?'At the start, all three points overlap at this display scale. Their coordinates are distinct.':t<Math.min(...first)?'The starts differ by less than a pixel. Their separation is already growing; the log plot reveals it.':'The same update has carried the nearby starts to visibly different states. Separation fluctuates after wrapping around the square.';
 document.querySelectorAll('[data-bits]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.bits)===bits)));
}
function play(){if(timer!==null){stop();return;}if(t>=80)t=0;$('play').textContent='Pause';$('play').setAttribute('aria-pressed','true');drawLaw();timer=setInterval(()=>{t++;drawLaw();if(t>=80)stop();},220);}
$('play').addEventListener('click',play);
$('restart').addEventListener('click',()=>{stop();t=0;drawLaw();});
$('time').addEventListener('input',e=>{stop();t=Number(e.target.value);drawLaw();});
document.querySelectorAll('[data-bits]').forEach(b=>b.addEventListener('click',()=>{stop();bits=Number(b.dataset.bits);paths=trajectories(bits);drawLaw();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
drawLaw();
