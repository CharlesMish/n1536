const fs=require('fs'),vm=require('vm'),assert=require('assert');
const {execFileSync}=require('node:child_process');
const root=require('path').join(__dirname,'../public/series/');let checks=0;const pass=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function sourceHTML(file){return fs.readFileSync(root+file,'utf8').replace(/<script\b([^>]*)><\/script>/g,(tag,attrs)=>{
 const src=attrs.match(/\bsrc="([^"]+)"/);if(!src||/\btype="module"/.test(attrs))return tag;
 return '<script>'+fs.readFileSync(require('path').join(root,src[1]),'utf8')+'</script>';
});}
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
for(const file of files){const html=sourceHTML(file);pass(file+' JavaScript parses',()=>{for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 const src=m[1].match(/\bsrc="([^"]+)"/);
 if(src)execFileSync(process.execPath,['--check',require('path').join(root,src[1])]);else new vm.Script(m[2]);
 }});
 pass(file+' local links resolve',()=>{for(const m of html.matchAll(/href="([^"#]+\.html)(?:#[^"]*)?"/g))if(!/^(?:https?:|\/\/)/.test(m[1]))assert(fs.existsSync(root+m[1]) || (m[1]==='../same-n.html' && fs.existsSync(require('path').join(__dirname,'../same-n.html'))),m[1]);});}
function ctx(file){let s=sourceHTML(file).match(/<script>([\s\S]*?)<\/script>/)[1];s=s.slice(0,s.indexOf('function I()'));if(s.includes('(function () {'))s=s.replace('(function () {','');const c={atob:s=>Buffer.from(s,'base64').toString('binary')};vm.createContext(c);vm.runInContext(s,c);return c;}
const earth=ctx('same-earth.html');
pass('Equal Earth unit area and analytic axis ratio agree with finite differences',()=>{
 const result=vm.runInContext(`(()=>{let maxArea=0,maxShape=0;for(const lat of [-80,-60,-30,0,30,60,80].map(d=>d*RAD))for(const lon of [-150,-60,0,60,150].map(d=>d*RAD)){
 const m=projectionMetrics('equalearth',lon,lat),h=1e-6,lo=equalEarthXY(lon-h,lat),hi=equalEarthXY(lon+h,lat),dn=equalEarthXY(lon,lat-h),up=equalEarthXY(lon,lat+h);
 const a=(hi[0]-lo[0])/(2*h*Math.cos(lat)),b=(up[0]-dn[0])/(2*h),c=(hi[1]-lo[1])/(2*h*Math.cos(lat)),d=(up[1]-dn[1])/(2*h),det=Math.abs(a*d-b*c),tr=a*a+b*b+c*c+d*d,ratio=(tr+Math.sqrt(Math.max(0,tr*tr-4*det*det)))/(2*det);
 maxArea=Math.max(maxArea,Math.abs(m.area-1),Math.abs(det-1));maxShape=Math.max(maxShape,Math.abs(m.shape-ratio)/ratio);}
 return {maxArea,maxShape};})()`,earth);console.log(result);assert(result.maxArea<1e-7&&result.maxShape<1e-7);
});
pass('Orthographic and Mercator known-angle checks',()=>{assert(vm.runInContext(`Math.abs(projectionMetrics('globe',Math.PI/3,0).area-.5)<1e-12 && Math.abs(projectionMetrics('globe',Math.PI/3,0).shape-2)<1e-12 && Math.abs(projectionMetrics('mercator',0,Math.PI/3).area-4)<1e-12 && projectionMetrics('mercator',0,.3).shape===1 && Number.isNaN(projectionMetrics('mercator',0,89*RAD).area)`,earth));});
pass('All disks across rotated seams remain inside projection domains',()=>{assert(vm.runInContext(`(()=>{for(const L0 of [-3,-1,0,1,3])for(const isM of [false,true])for(let i=0;i<N;i++)for(const p of mapDiskParts(disks[i],pts[i].lon,L0,isM))for(let k=0;k<p.length;k++){const q=p[k],r=p[(k+1)%p.length];if(Math.abs(q[0])>Math.PI+1e-12||isM&&Math.abs(q[1])>MERC_MAX+1e-12||Math.abs(q[0]-r[0])>Math.PI)return false;}return true;})()`,earth));});
const samples=ctx('same-samples-2.html');pass('All three interpolants retain nodal agreement',()=>{assert(vm.runInContext(`['global','local','periodic'].every(k=>buildCurve(k,Y).resid<1e-12)`,samples));});
const marg=ctx('same-marginals-2.html');pass('Marginal permutations remain bijective with expected correlations',()=>{assert(vm.runInContext(`['align','oppose','scramble'].every(k=>new Set(permOf(k)).size===N)&&Math.abs(spearman(permOf('scramble'))+0.0002288853284504455)<1e-14`,marg));});
const mag=ctx('same-magnitude-2.html');pass('Three Fourier reconstructions retain magnitude and realness',()=>{assert(vm.runInContext(`(()=>{const s=spectrumOf(makeSource()),d=spectrumOf(makeDonor()),m=Float64Array.from(s.re,(r,i)=>Math.hypot(r,s.im[i]));return ['source','borrowed','scrambled'].every(k=>{const o=invert(buildSpectrum(m,s,d,k,SEED));return o.imagMax<1e-12&&auditMagnitude(o.field,m).maxRel<1e-12;});})()`,mag));});
const shadow=ctx('same-shadow-2.html');pass('Canonical shadow masks remain identical',()=>assert(vm.runInContext('auditMasks().mismatch===0',shadow)));
function newKernel(file){const s=sourceHTML(file).match(/<script>([\s\S]*?)<\/script>/)[1],c=vm.createContext({});vm.runInContext(s.slice(0,s.indexOf('const themeButton=')),c);return c;}
const law=newKernel('same-law.html'),average=newKernel('same-average.html');
pass('LAW exact modular updates invert for every displayed state',()=>assert(vm.runInContext(`(()=>{for(const bits of [12,24,40])for(const p of trajectories(bits))for(let i=1;i<p.length;i++){if(p[i].some(v=>v<0n||v>=Q))return false;const back=inverse(p[i]);if(back.some((v,j)=>v!==p[i-1][j]))return false;}return true;})()`,law)));
pass('LAW starts have the declared distance and remain distinct',()=>assert(vm.runInContext(`(()=>{for(const bits of [12,24,40]){const p=trajectories(bits);for(const j of [1,2]){if(distance(p[0][0],p[j][0])!==2**-bits)return false;for(let i=0;i<=80;i++)if(p[0][i].every((v,k)=>v===p[j][i][k]))return false;}}return true;})()`,law)));
pass('AVERAGE preserves each record and reconstructs every declared cell',()=>assert(vm.runInContext(`(()=>{const base=records(GROUPS[0]);for(const state of GROUPS){const rr=records(state);if(rr.length!==400||new Set(rr.map(r=>r.id)).size!==400)return false;for(let i=0;i<400;i++)if(['id','category','success'].some(k=>rr[i][k]!==base[i][k]))return false;for(let g=0;g<2;g++)for(let c=0;c<2;c++){const rows=rr.filter(r=>r.group===g&&r.category===c),[k,n]=state.cells[g][c];if(rows.length!==n||rows.filter(r=>r.success).length!==k)return false;}}return true;})()`,average)));
pass('AVERAGE pooled counts and within-group comparisons agree exactly',()=>assert(vm.runInContext(`(()=>{for(let j=0;j<3;j++){const cells=GROUPS[j].cells;for(let c=0;c<2;c++){if(cells[0][c][0]+cells[1][c][0]!==[120,80][c]||cells[0][c][1]+cells[1][c][1]!==200)return false;}for(const [a,b] of cells){const numerator=a[0]*b[1]-b[0]*a[1],denominator=a[1]*b[1];if(j===0&&numerator*5!==denominator||j===1&&numerator!==0||j===2&&numerator*10!==-denominator)return false;}}return true;})()`,average)));
pass('Nineteen numbered studies have matching book entries and valid specimens',()=>{
 const index=sourceHTML('index.html'),book=sourceHTML('plates.html');
 const a=JSON.parse(index.match(/const STUDIES = (\[[\s\S]*?\n\]);/)[1]),b=JSON.parse(book.match(/const PLATES = (\[[\s\S]*?\n\]);/)[1]);
 const figs=JSON.parse(book.match(/^const FIGS = (.*);$/m)[1]),specs=JSON.parse(index.match(/^const SPECIMENS = (.*);$/m)[1]);
 assert(a.length===19&&b.length===19);for(let i=0;i<19;i++){const n=String(i+1).padStart(2,'0');assert(a[i].study===n&&b[i].n===n&&a[i].file===b[i].file);assert(fs.readFileSync(root+a[i].file,'utf8').toUpperCase().includes('FIELD STUDY '+n));assert(figs['p'+n]===specs[n]&&!specs[n].includes('undefined'));}
});
// A small event harness exercises the actual new-page scripts without a browser or layout engine.
function interfaceHarness(file){const html=sourceHTML(file),nodes=new Map();
 const node=()=>({textContent:'',innerHTML:'',value:'',dataset:{},events:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.events[k]=f;}});
 for(const m of html.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],node());
 const bits=[12,24,40].map(v=>Object.assign(node(),{dataset:{bits:String(v)}})),states=[0,1,2].map(v=>Object.assign(node(),{dataset:{state:String(v)}}));let tick=null;
 const doc={documentElement:{dataset:{}},getElementById:id=>{assert(nodes.has(id),'unknown DOM id '+id);return nodes.get(id);},querySelectorAll:s=>s==='[data-bits]'?bits:s==='[data-state]'?states:[],events:{},addEventListener(k,f){this.events[k]=f;}};
 const c=vm.createContext({document:doc,localStorage:{getItem:()=>null,setItem:()=>{}},setInterval:f=>{tick=f;return 1;},clearInterval:()=>{tick=null;}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],c);
 return {nodes,bits,states,doc,tick:()=>tick?.(),context:c};
}
pass('LAW play, restart, scrubbing, precision and theme controls execute',()=>{
 const h=interfaceHarness('same-law.html'),get=id=>h.nodes.get(id);assert(get('time').value===32);
 get('restart').events.click();assert(get('time').value===0);h.bits[0].events.click();assert(get('epsilon').textContent.includes('12'));
 get('play').events.click();h.tick();assert(get('time').value===1);get('time').events.input({target:{value:'79'}});get('play').events.click();h.tick();assert(get('time').value===80&&get('play').textContent==='Play');
 get('theme').events.click();assert(h.doc.documentElement.dataset.theme==='paper');assert(!get('orbits').innerHTML.includes('NaN'));
});
pass('AVERAGE controls render every grouping and all 400 record marks',()=>{
 const h=interfaceHarness('same-average.html');for(let i=0;i<3;i++){h.states[i].events.click();const text=h.nodes.get('recordFields').innerHTML;assert((text.match(/<title>[AB]\d{3}:/g)||[]).length===400);assert((h.nodes.get('auditRows').innerHTML.match(/<tr>/g)||[]).length===6);assert(h.states[i].attrs['aria-pressed']==='true');}
 assert(h.nodes.get('claim').textContent==='B leads within both groups.');
});

console.log('TOTAL '+checks+' checks passed.');
