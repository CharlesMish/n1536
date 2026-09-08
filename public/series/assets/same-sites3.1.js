
const SITES = Object.freeze([
  Object.freeze({ id: 0, mark: "01", x: 0.18, y: 0.22 }),
  Object.freeze({ id: 1, mark: "02", x: 0.36, y: 0.43 }),
  Object.freeze({ id: 2, mark: "03", x: 0.76, y: 0.16 }),
  Object.freeze({ id: 3, mark: "04", x: 0.88, y: 0.46 }),
  Object.freeze({ id: 4, mark: "05", x: 0.51, y: 0.54 }),
  Object.freeze({ id: 5, mark: "06", x: 0.14, y: 0.76 }),
  Object.freeze({ id: 6, mark: "07", x: 0.64, y: 0.84 })
]);
const N = SITES.length;
const GS = 360;
const EPS = 1e-14;
const UV_PAL = ["#B59BFF","#67D7C4","#F2A65A","#E57FA6","#8EC5FF","#C4D36A","#D7B3FF"];
const PAPER_PAL = ["#9C3038","#1C6673","#B16D28","#7A3A58","#2B5C8A","#5A6B24","#6B3D7A"];
const MEET_CAPTION = "Balls of radius d/2. Their contact set is equidistant.";

const META = {
  euclidean: {
    index:"01", name:"Euclidean", claim:"Straight line", key:"L2", p:2,
    note:"Ownership is ordinary distance. The shortest path is a segment.",
    plateTitle:"Fig. 01 — two circles", plateCaption:MEET_CAPTION, plateSide:"straight line"
  },
  taxicab: {
    index:"02", name:"Taxicab", claim:"Axis travel", key:"L1", p:1,
    note:"Ownership is the sum of the two axes. The shortest path follows the grid.",
    plateTitle:"Fig. 02 — two diamonds", plateCaption:MEET_CAPTION, plateSide:"axis travel"
  },
  chebyshev: {
    index:"03", name:"Chebyshev", claim:"Worst axis", key:"L∞", p:Infinity,
    note:"Ownership is the larger axis. A square step costs the same as a king’s move.",
    plateTitle:"Fig. 03 — two squares", plateCaption:MEET_CAPTION, plateSide:"worst axis"
  }
};

function hexToRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function ease(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
function checksum(sites){
  let h=2166136261;
  for (const s of sites){
    const ix=(s.x*1e6)|0, iy=(s.y*1e6)|0;
    h^=ix; h=Math.imul(h,16777619); h^=iy; h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(16).toUpperCase().slice(-4);
}
function isInfP(p){ return !Number.isFinite(p); }
function pOf(method){ return META[method].p; }
function invP(p){ return isInfP(p) ? 0 : 1/p; }
function pFromInv(u){ return u<=0 ? Infinity : 1/u; }
function formatP(p){ return isInfP(p) ? "∞" : (p>=100 ? p.toExponential(2) : p.toFixed(p>=10?1:2)); }

function distP(p, x, y, s){
  const dx=Math.abs(x-s.x), dy=Math.abs(y-s.y);
  if (isInfP(p)) return Math.max(dx, dy);
  if (p===1) return dx+dy;
  if (p===2) return Math.hypot(dx, dy);
  const m=Math.max(dx, dy);
  if (m===0) return 0;
  const a=dx/m, b=dy/m;
  return m * Math.pow(Math.pow(a,p)+Math.pow(b,p), 1/p);
}

function nearest(p, x, y){
  let best=0, d0=Infinity, d1=Infinity;
  for (let i=0;i<N;i++){
    const di=distP(p,x,y,SITES[i]);
    if (di<d0-EPS || (Math.abs(di-d0)<=EPS && i<best)){
      d1=d0; d0=di; best=i;
    } else if (di<d1) d1=di;
  }
  return {owner:best, d0, d1};
}

function rowY(j, G){ return 1 - (j + 0.5) / G; }

function contactSet(p, A, B){
  const dx=B.x-A.x, dy=B.y-A.y;
  const M={x:(A.x+B.x)*0.5, y:(A.y+B.y)*0.5};
  const adx=Math.abs(dx), ady=Math.abs(dy);
  const sx=dx<0?-1:1, sy=dy<0?-1:1;
  if (isInfP(p)){
    if (adx>ady+1e-12){
      const half=(adx-ady)*0.5;
      return [{x:M.x, y:M.y-half}, {x:M.x, y:M.y+half}];
    }
    if (ady>adx+1e-12){
      const half=(ady-adx)*0.5;
      return [{x:M.x-half, y:M.y}, {x:M.x+half, y:M.y}];
    }
    return [M];
  }
  if (p===1){
    if (adx<1e-12 && ady<1e-12) return [M];
    if (adx>=ady){
      return [
        {x:A.x+sx*(adx+ady)*0.5, y:A.y},
        {x:A.x+sx*(adx-ady)*0.5, y:A.y+sy*ady}
      ];
    }
    return [
      {x:A.x, y:A.y+sy*(adx+ady)*0.5},
      {x:A.x+sx*adx, y:A.y+sy*(ady-adx)*0.5}
    ];
  }
  return [M];
}

function rivalOf(p, siteId){
  const a=SITES[siteId];
  let best=siteId===0?1:0, d=Infinity;
  for (const s of SITES){
    if (s.id===siteId) continue;
    const di=distP(p, a.x, a.y, s);
    if (di<d-EPS || (Math.abs(di-d)<=EPS && s.id<best)){ d=di; best=s.id; }
  }
  return {id:best, d};
}

function classifyGrid(p, G){
  const owner=new Uint8Array(G*G);
  const gap=new Float32Array(G*G);
  const area=new Float64Array(N);
  for (let j=0;j<G;j++){
    const y=rowY(j,G);
    for (let i=0;i<G;i++){
      const x=(i+0.5)/G;
      const r=nearest(p,x,y);
      const k=j*G+i;
      owner[k]=r.owner;
      area[r.owner]++;
      gap[k]=r.d1-r.d0;
    }
  }
  const adj=Array.from({length:N},()=>new Set());
  for (let j=0;j<G;j++){
    for (let i=0;i<G;i++){
      const a=owner[j*G+i];
      if (i+1<G){ const b=owner[j*G+i+1]; if (a!==b){ adj[a].add(b); adj[b].add(a); } }
      if (j+1<G){ const b=owner[(j+1)*G+i]; if (a!==b){ adj[a].add(b); adj[b].add(a); } }
    }
  }
  const frac=Array.from(area, v=>v/(G*G));
  const mean=frac.reduce((s,v)=>s+v,0)/N;
  let v=0; for (const f of frac) v+=(f-mean)*(f-mean);
  const cv=Math.sqrt(v/N)/mean;
  return {owner, gap, frac, cv, neigh:adj.map(s=>s.size), p, G};
}

function I(){
  const app=document.getElementById("app");
  const stage=document.getElementById("stage");
  const canvas=document.getElementById("field");
  const ctx=canvas.getContext("2d",{alpha:true});
  const plate=document.getElementById("plate");
  const pctx=plate.getContext("2d");
  const loader=document.getElementById("loader");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");

  let theme="uv", method="euclidean";
  let showBall=false, showMargin=false;
  let pinSite=4, hoverSite=-1;
  let W=1,H=1,PR=1;
  let morphing=false, morphT0=0, pFrom=2, pTo=2, pNow=2;
  let dirty=true;
  const DUR=900;
  const maps={};
  const raster=document.createElement("canvas");
  raster.width=GS; raster.height=GS;
  const rctx=raster.getContext("2d");
  const img=rctx.createImageData(GS,GS);
  const paintCache=new Map();

  maps.euclidean=classifyGrid(2,GS);
  maps.taxicab=classifyGrid(1,GS);
  maps.chebyshev=classifyGrid(Infinity,GS);

  function pal(){ return theme==="uv"?UV_PAL:PAPER_PAL; }
  function css(){ return getComputedStyle(app); }
  function cols(){
    const s=css();
    return {
      ink:s.getPropertyValue("--ink").trim(),
      muted:s.getPropertyValue("--ink-muted").trim(),
      faint:s.getPropertyValue("--ink-faint").trim(),
      rule:s.getPropertyValue("--rule").trim(),
      accent:s.getPropertyValue("--accent").trim(),
      warm:s.getPropertyValue("--warm").trim(),
      alert:s.getPropertyValue("--alert").trim()
    };
  }

  function fieldRect(){
    if(W<=700)return{x:22,y:24,w:W-44,h:H-48};
    const top=Math.min(H*0.24,188);
    const bot=Math.min(H*0.30,230);
    const left=W>860?Math.min(W*0.24,340):Math.min(W*0.08,36);
    const right=W>860?Math.min(W*0.32,380):Math.min(W*0.08,36);
    return {x:left,y:top,w:Math.max(40,W-left-right),h:Math.max(40,H-top-bot)};
  }
  function domainLayout(){
    const r=fieldRect();
    const s=Math.min(r.w, r.h);
    return {s, dw:s, dh:s, x:r.x+(r.w-s)/2, y:r.y+(r.h-s)/2};
  }
  function toXY(u,v,L){ return [L.x+u*L.dw, L.y+(1-v)*L.dh]; }

  function canonicalMap(){ return maps[method]; }
  function displayP(){ return morphing ? pNow : pOf(method); }

  function paintFromOwner(owner, gap){
    const palette=pal();
    const data=img.data;
    const thin=0.028;
    for (let k=0;k<owner.length;k++){
      const rgb=hexToRgb(palette[owner[k]]);
      let t=theme==="uv"?0.44:0.40;
      if (showMargin) t = gap[k]<thin ? 0.84 : t*0.42;
      const o=k*4;
      data[o]=rgb[0]; data[o+1]=rgb[1]; data[o+2]=rgb[2]; data[o+3]=(t*255)|0;
    }
    rctx.putImageData(img,0,0);
  }

  function paintRaster(p){
    if (!morphing){
      const key=method+"|"+theme+"|"+(showMargin?"m":"-");
      const hit=paintCache.get(key);
      if (hit){ rctx.putImageData(hit,0,0); return; }
      const map=maps[method];
      paintFromOwner(map.owner, map.gap);
      paintCache.set(key, rctx.getImageData(0,0,GS,GS));
      return;
    }
    const owner=new Uint8Array(GS*GS);
    const gap=new Float32Array(GS*GS);
    for (let j=0;j<GS;j++){
      const y=rowY(j,GS);
      for (let i=0;i<GS;i++){
        const r=nearest(p,(i+0.5)/GS,y);
        const k=j*GS+i;
        owner[k]=r.owner;
        gap[k]=r.d1-r.d0;
      }
    }
    paintFromOwner(owner, gap);
  }

  function strokeBall(ctx2, cx, cy, R, p, s){
    ctx2.beginPath();
    if (isInfP(p)){
      const a=R*s;
      ctx2.rect(cx-a, cy-a, a*2, a*2);
    } else if (p===1){
      const a=R*s;
      ctx2.moveTo(cx, cy-a); ctx2.lineTo(cx+a, cy); ctx2.lineTo(cx, cy+a); ctx2.lineTo(cx-a, cy); ctx2.closePath();
    } else if (Math.abs(p-2)<1e-9){
      ctx2.arc(cx, cy, R*s, 0, Math.PI*2);
    } else {
      const steps=96;
      for (let k=0;k<=steps;k++){
        const th=k/steps*Math.PI*2;
        const c=Math.cos(th), si=Math.sin(th);
        const den=Math.pow(Math.abs(c),p)+Math.pow(Math.abs(si),p);
        const rp=R/Math.pow(den,1/p)*s;
        const x=cx+rp*c, y=cy-rp*si;
        if (k===0) ctx2.moveTo(x,y); else ctx2.lineTo(x,y);
      }
    }
  }

  function strokeContact(ctx2, p, A, B, project, col){
    const touch=contactSet(p,A,B);
    ctx2.save();
    ctx2.fillStyle=col.warm;
    ctx2.strokeStyle=col.warm;
    ctx2.lineWidth=1.6;
    ctx2.globalAlpha=1;
    if (touch.length===1){
      const [mx,my]=project(touch[0].x,touch[0].y);
      ctx2.beginPath(); ctx2.arc(mx,my,2.3,0,Math.PI*2); ctx2.fill();
    } else {
      ctx2.beginPath();
      touch.forEach((pt,i)=>{
        const [x,y]=project(pt.x,pt.y);
        if (i===0) ctx2.moveTo(x,y); else ctx2.lineTo(x,y);
      });
      ctx2.stroke();
      const mid=touch[0];
      const [mx,my]=project((touch[0].x+touch[1].x)*0.5,(touch[0].y+touch[1].y)*0.5);
      ctx2.beginPath(); ctx2.arc(mx,my,2.1,0,Math.PI*2); ctx2.fill();
    }
    ctx2.restore();
  }

  function drawBalls(L, p, col){
    const a=SITES[pinSite];
    const rv=rivalOf(p, pinSite);
    const b=SITES[rv.id];
    const R=rv.d*0.5;
    if (R<=0) return;
    const [ax,ay]=toXY(a.x,a.y,L);
    const [bx,by]=toXY(b.x,b.y,L);
    ctx.save();
    ctx.strokeStyle=col.warm;
    ctx.lineWidth=1.2;
    ctx.globalAlpha=0.95;
    strokeBall(ctx, ax, ay, R, p, L.s);
    ctx.stroke();
    ctx.globalAlpha=0.55;
    strokeBall(ctx, bx, by, R, p, L.s);
    ctx.stroke();
    ctx.globalAlpha=1;
    strokeContact(ctx, p, a, b, (x,y)=>toXY(x,y,L), col);
    ctx.restore();
  }

  function drawSites(L, col){
    const palette=pal();
    ctx.save();
    ctx.font="9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    for (const s of SITES){
      const [x,y]=toXY(s.x,s.y,L);
      const active=s.id===pinSite || s.id===hoverSite;
      ctx.beginPath();
      ctx.fillStyle=palette[s.id];
      ctx.strokeStyle=col.ink;
      ctx.lineWidth=active?1.8:1;
      ctx.globalAlpha=1;
      ctx.arc(x,y, active?5.2:4.1, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle=col.muted;
      ctx.globalAlpha=0.95;
      ctx.fillText(s.mark, x, y+13);
    }
    ctx.restore();
  }

  function drawField(){
    const col=cols();
    ctx.setTransform(PR,0,0,PR,0,0);
    ctx.clearRect(0,0,W,H);
    const L=domainLayout();
    paintRaster(displayP());
    ctx.fillStyle=theme==="uv"?"rgba(18,16,34,0.55)":"rgba(245,239,228,0.45)";
    ctx.fillRect(L.x,L.y,L.dw,L.dh);
    ctx.drawImage(raster, L.x, L.y, L.dw, L.dh);
    ctx.strokeStyle=col.rule;
    ctx.lineWidth=1;
    ctx.strokeRect(L.x-0.5,L.y-0.5,L.dw+1,L.dh+1);
    if (showBall) drawBalls(L, displayP(), col);
    drawSites(L,col);
  }

  function drawPlate(){
    const col=cols();
    const w=plate.width, h=plate.height;
    pctx.setTransform(1,0,0,1,0,0);
    pctx.clearRect(0,0,w,h);
    pctx.fillStyle=theme==="uv"?"#171329":"#F5EFE4";
    pctx.fillRect(0,0,w,h);
    pctx.strokeStyle=theme==="uv"?"rgba(77,70,114,0.55)":"rgba(128,111,100,0.38)";
    pctx.strokeRect(0.5,0.5,w-1,h-1);

    const p = morphing ? pNow : pOf(method);
    const a=SITES[pinSite];
    const rv=rivalOf(p, pinSite);
    const b=SITES[rv.id];
    const d=rv.d, R=d*0.5;
    const palette=pal();

    pctx.font="9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    pctx.fillStyle=col.faint;
    pctx.fillText(morphing ? ("Lp continuation  p = "+formatP(p)) : META[method].key, 16, 18);

    const ox=16, oy=36, side=148;
    pctx.strokeStyle=col.rule;
    pctx.strokeRect(ox+0.5,oy+0.5,side-1,side-1);

    const minX=Math.min(a.x,b.x)-R, maxX=Math.max(a.x,b.x)+R;
    const minY=Math.min(a.y,b.y)-R, maxY=Math.max(a.y,b.y)+R;
    const span=Math.max(maxX-minX, maxY-minY, 1e-6);
    const pad=side*0.12;
    const sc=(side-2*pad)/span;
    const midX=(minX+maxX)*0.5, midY=(minY+maxY)*0.5;
    const cx=ox+side/2, cy=oy+side/2;
    function P(x,y){ return [cx+(x-midX)*sc, cy-(y-midY)*sc]; }
    const [ax,ay]=P(a.x,a.y);
    const [bx,by]=P(b.x,b.y);

    pctx.strokeStyle=col.warm;
    pctx.lineWidth=1.2;
    pctx.globalAlpha=0.95;
    strokeBall(pctx, ax, ay, R, p, sc);
    pctx.stroke();
    pctx.globalAlpha=0.7;
    strokeBall(pctx, bx, by, R, p, sc);
    pctx.stroke();
    pctx.globalAlpha=1;
    pctx.fillStyle=palette[a.id];
    pctx.beginPath(); pctx.arc(ax,ay,3.4,0,Math.PI*2); pctx.fill();
    pctx.fillStyle=palette[b.id];
    pctx.beginPath(); pctx.arc(bx,by,3.4,0,Math.PI*2); pctx.fill();
    strokeContact(pctx, p, a, b, P, col);
    pctx.fillStyle=col.faint;
    pctx.fillText("site "+a.mark, ox, oy+side+16);
    pctx.fillText("rival "+b.mark, ox, oy+side+30);

    const map=canonicalMap();
    const barX=ox+side+28;
    function bar(y,label,val,color){
      pctx.fillStyle=col.faint; pctx.fillText(label, barX, y);
      pctx.fillStyle=theme==="uv"?"#2a2542":"#d7ccc0";
      pctx.fillRect(barX,y+8,150,8);
      pctx.fillStyle=color;
      pctx.fillRect(barX,y+8,Math.max(1,150*Math.min(1,val)),8);
    }
    const clearCanon=rivalOf(pOf(method), pinSite).d;
    bar(48,"cell area", map.frac[pinSite], col.accent);
    pctx.fillStyle=col.muted;
    pctx.fillText(map.frac[pinSite].toFixed(3), barX+118, 48);
    bar(92,"clearance d", clearCanon/0.5, col.alert);
    pctx.fillStyle=col.muted;
    pctx.fillText(clearCanon.toFixed(3), barX+118, 92);
    pctx.fillStyle=col.faint;
    pctx.fillText("neigh "+map.neigh[pinSite], barX, 148);
    pctx.fillText(morphing?"field is Lp · stats are endpoint":"canonical metric", barX, 166);
  }

  function updateReadout(){
    if(morphing){for(const id of ["statCell","statNeigh","statSpread"])document.getElementById(id).textContent="—";document.getElementById("statSite").textContent=SITES[pinSite].mark;return;}
    const map=canonicalMap();
    document.getElementById("statCell").textContent=(map.frac[pinSite]*100).toFixed(1)+"%";
    document.getElementById("statNeigh").textContent=String(map.neigh[pinSite]).padStart(2,"0");
    document.getElementById("statSpread").textContent=map.cv.toFixed(2);
    document.getElementById("statSite").textContent=SITES[pinSite].mark;
  }

  function applyMeta(){
    const e=META[method];
    document.getElementById("methodIndex").textContent=e.index;
    document.getElementById("methodName").textContent=e.name;
    document.getElementById("methodClaim").textContent=e.claim;
    document.getElementById("methodNote").textContent=e.note;
    document.getElementById("plateTitle").textContent=e.plateTitle;
    document.getElementById("plateCaption").textContent=e.plateCaption;
    document.getElementById("plateSide").textContent=e.plateSide;
    document.getElementById("plateKey").textContent=e.key;
    document.querySelectorAll(".method-nav button").forEach((btn)=>{
      const on=btn.dataset.method===method;
      btn.classList.toggle("is-active",on);
      btn.setAttribute("aria-pressed",on?"true":"false");
    });
    document.getElementById("ballBtn").classList.toggle("is-active",showBall);
    document.getElementById("marginBtn").classList.toggle("is-active",showMargin);
    document.getElementById("ballBtn").setAttribute("aria-pressed",showBall?"true":"false");
    document.getElementById("marginBtn").setAttribute("aria-pressed",showMargin?"true":"false");
    document.getElementById("ballKey").classList.toggle("is-visible",showBall);
    document.getElementById("marginKey").classList.toggle("is-visible",showMargin);
    document.getElementById("live").textContent=e.name+". "+e.claim+". Same seven sites. Site "+SITES[pinSite].mark+" selected.";
    document.getElementById("usePlate").classList.toggle("is-inspecting", true);
    updateReadout();
    drawPlate();
    dirty=true;
  }

  function selectMethod(next){
    if (next===method && !morphing) return;
    if (!reduced.matches){
      pFrom=morphing?pNow:pOf(method);
      pTo=pOf(next);
      morphing=true; morphT0=performance.now();
    } else {
      morphing=false; pNow=pOf(next);
    }
    method=next;
    applyMeta();
  }

  function hitSite(mx,my){
    const L=domainLayout();
    let best=-1, bestD=16;
    for (const s of SITES){
      const [x,y]=toXY(s.x,s.y,L);
      const d=Math.hypot(mx-x,my-y);
      if (d<bestD){ bestD=d; best=s.id; }
    }
    return best;
  }

  function setTheme(next){
    theme=next;
    app.className="same-sites theme-"+theme;
    document.getElementById("paperLabel").classList.toggle("is-active",theme==="paper");
    document.getElementById("uvLabel").classList.toggle("is-active",theme==="uv");
    paintCache.clear();
    drawPlate();
    dirty=true;
  }

  function resize(){
    const r=stage.getBoundingClientRect();
    W=Math.max(1,Math.round(r.width));
    H=Math.max(1,Math.round(r.height));
    PR=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(W*PR);
    canvas.height=Math.floor(H*PR);
    canvas.style.width=W+"px";
    canvas.style.height=H+"px";
    dirty=true;
  }

  function loop(now){
    if (morphing){
      const t=Math.min(1,(now-morphT0)/DUR);
      const u=reduced.matches?1:ease(t);
      const a=invP(pFrom), b=invP(pTo);
      pNow=pFromInv(a+(b-a)*u);
      if (t>=1){ morphing=false; pNow=pTo; updateReadout();drawPlate(); }
      dirty=true;
    }
    if (dirty){
      drawField();
      dirty=false;
    }
    requestAnimationFrame(loop);
  }

  document.getElementById("themeBtn").addEventListener("click",()=>setTheme(theme==="uv"?"paper":"uv"));
  document.querySelectorAll(".method-nav button").forEach((btn)=>{
    btn.addEventListener("click",()=>selectMethod(btn.dataset.method));
  });
  document.getElementById("ballBtn").addEventListener("click",()=>{ showBall=!showBall; paintCache.clear(); applyMeta(); });
  document.getElementById("marginBtn").addEventListener("click",()=>{ showMargin=!showMargin; paintCache.clear(); applyMeta(); });
  stage.addEventListener("pointermove",(ev)=>{
    const r=canvas.getBoundingClientRect();
    const next=hitSite(ev.clientX-r.left, ev.clientY-r.top);
    if (next!==hoverSite){ hoverSite=next; dirty=true; }
  });
  stage.addEventListener("pointerdown",(ev)=>{
    const r=canvas.getBoundingClientRect();
    const s=hitSite(ev.clientX-r.left, ev.clientY-r.top);
    if (s>=0){ pinSite=s; applyMeta(); }
  });
  window.addEventListener("keydown",(ev)=>{
    if (ev.key==="1") selectMethod("euclidean");
    else if (ev.key==="2") selectMethod("taxicab");
    else if (ev.key==="3") selectMethod("chebyshev");
    else if (ev.key==="t"||ev.key==="T") setTheme(theme==="uv"?"paper":"uv");
    else if (ev.key==="b"||ev.key==="B"){ showBall=!showBall; paintCache.clear(); applyMeta(); }
    else if (ev.key==="m"||ev.key==="M"){ showMargin=!showMargin; paintCache.clear(); applyMeta(); }
    else if (ev.key==="["){ pinSite=(pinSite+N-1)%N; applyMeta(); }
    else if (ev.key==="]"){ pinSite=(pinSite+1)%N; applyMeta(); }
  });
  window.addEventListener("resize",resize);
  resize();
  document.getElementById("sitesChecksum").textContent="N = 7 · Σ "+checksum(SITES);
  applyMeta();
  loader.classList.add("is-hidden");
  requestAnimationFrame(loop);
}
I();

  