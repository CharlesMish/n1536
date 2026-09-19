function I(){
"use strict";

/* ---- frozen catalogue -------------------------------------------------- */
/* Each move: turn in place by deg, then walk r straight ahead.             */
const ANG = Object.freeze([120, 30, 20, 40, 60, 90]);
const RAD = Object.freeze([0.26, 0.41, 0.26, 0.28, 0.59, 0.30]);
const MARK = Object.freeze(["01","02","03","04","05","06"]);
const N = 6;
const FACT = 720;
const NET_TURN = ANG.reduce((a,b)=>a+b,0);          /* 360 exactly          */
const TOTAL_LEN = RAD.reduce((a,b)=>a+b,0);         /* 2.10 exactly         */
const MAX_COMM = 0.807279;                          /* largest pair gap     */
const DIAM_ONE = 2.155995;                          /* cloud diam at L=1    */
const VIEW = Object.freeze({ cx:0.28, cy:0.40, side:3.80 });
const DEG = Math.PI/180;

const ORDERS = Object.freeze({
  given:    Object.freeze([0,1,2,3,4,5]),
  reversed: Object.freeze([5,4,3,2,1,0]),
  shuffled: Object.freeze([1,2,3,0,5,4])
});

const META = {
  given: {
    index:"01", name:"Given", claim:"Catalogue order", key:"1·2·3·4·5·6",
    note:"The six moves applied in the order the catalogue lists them.",
    plateSide:"catalogue order"
  },
  reversed: {
    index:"02", name:"Reversed", claim:"Exact reverse", key:"6·5·4·3·2·1",
    note:"The same six moves, last to first. Nothing is added or dropped.",
    plateSide:"exact reverse"
  },
  shuffled: {
    index:"03", name:"Shuffled", claim:"One named permutation", key:"2·3·4·1·6·5",
    note:"A single fixed permutation, chosen once and stored. Not a draw made on load.",
    plateSide:"named permutation"
  },
  custom: {
    index:"—", name:"Selected", claim:"One of 720", key:"picked from the trace",
    note:"An ordering taken from the endpoint trace. The same six moves in a fourth sequence.",
    plateSide:"selected ordering"
  }
};

/* ---- all 720 orderings, enumerated once -------------------------------- */
const PERMS = (function(){
  const out = [], a = [0,1,2,3,4,5];
  (function rec(k){
    if (k===N){ out.push(a.slice()); return; }
    for (let i=k;i<N;i++){
      const t=a[k]; a[k]=a[i]; a[i]=t;
      rec(k+1);
      const u=a[k]; a[k]=a[i]; a[i]=u;
    }
  })(0);
  return out;
})();
const PERM_AT = new Map();
for (let i=0;i<PERMS.length;i++) PERM_AT.set(PERMS[i].join(""), i);

/* ---- kinematics -------------------------------------------------------- */
function walk(order, lam){
  const out = [{x:0,y:0,th:0}];
  let th=0, x=0, y=0;
  for (let k=0;k<order.length;k++){
    const i = order[k];
    th += ANG[i]*DEG*lam;
    x += Math.cos(th)*RAD[i];
    y += Math.sin(th)*RAD[i];
    out.push({x:x, y:y, th:th});
  }
  return out;
}
function endOf(order, lam){
  let th=0, x=0, y=0;
  for (let k=0;k<order.length;k++){
    const i = order[k];
    th += ANG[i]*DEG*lam;
    x += Math.cos(th)*RAD[i];
    y += Math.sin(th)*RAD[i];
  }
  return {x:x, y:y, th:th};
}

const cloudXY = new Float64Array(FACT*2);
let cloudLam = NaN;
function buildCloud(lam){
  if (cloudLam===lam) return;
  for (let q=0;q<FACT;q++){
    const p = PERMS[q];
    let th=0, x=0, y=0;
    for (let k=0;k<N;k++){
      const i = p[k];
      th += ANG[i]*DEG*lam;
      x += Math.cos(th)*RAD[i];
      y += Math.sin(th)*RAD[i];
    }
    cloudXY[q*2] = x; cloudXY[q*2+1] = y;
  }
  cloudLam = lam;
}

const diamCache = new Map();
function diameter(lam){
  const key = lam.toFixed(6);
  if (diamCache.has(key)) return diamCache.get(key);
  buildCloud(lam);
  let best = 0;
  for (let i=0;i<FACT;i++){
    const xi=cloudXY[i*2], yi=cloudXY[i*2+1];
    for (let j=i+1;j<FACT;j++){
      const dx=xi-cloudXY[j*2], dy=yi-cloudXY[j*2+1];
      const d2 = dx*dx+dy*dy;
      if (d2>best) best = d2;
    }
  }
  const v = Math.sqrt(best);
  diamCache.set(key, v);
  return v;
}

function pairEnd(i, j, lam){
  let th=0, x=0, y=0;
  const seq = [i,j];
  for (let k=0;k<2;k++){
    const m = seq[k];
    th += ANG[m]*DEG*lam;
    x += Math.cos(th)*RAD[m];
    y += Math.sin(th)*RAD[m];
  }
  return {x:x, y:y};
}
function commGap(i, j, lam){
  const a = pairEnd(i,j,lam), b = pairEnd(j,i,lam);
  return Math.hypot(a.x-b.x, a.y-b.y);
}

/* ---- dom --------------------------------------------------------------- */
const app    = document.getElementById("app");
const stage  = document.getElementById("stage");
const canvas = document.getElementById("field");
const ctx    = canvas.getContext("2d");
const plate  = document.getElementById("plate");
const pctx   = plate.getContext("2d");
const loader = document.getElementById("loader");
const stepIn = document.getElementById("stepRange");
const stepOut= document.getElementById("stepOut");
const reduced= matchMedia("(prefers-reduced-motion: reduce)");

/* ---- state ------------------------------------------------------------- */
let theme = "uv";
let methodKey = "given";
let order = ORDERS.given.slice();
let step = N;
let showTrace = false;
let commute = false;
let lam = 1, lamFrom = 1, lamTo = 1, lamMorph = false, lamT0 = 0;
let seqFrom = null, seqTo = null, seqMorph = false, seqT0 = 0;
let hoverQ = -1;
let playing = false, playT0 = 0, playFrom = 0;
let W=1, H=1, PR=1, dirty = true;
let frameId = 0, hiddenAt = 0;
const DUR = 620, PLAY_MS = 520;

function morphing(){ return lamMorph || seqMorph; }
function wake(){ if (!document.hidden && !frameId) frameId=requestAnimationFrame(loop); }

/* ---- palette ----------------------------------------------------------- */
function cols(){
  const uv = theme==="uv";
  return {
    ink:    uv?"#F6F2FF":"#271E1B",
    muted:  uv?"#C9C0E5":"#62564F",
    faint:  uv?"#8D83B2":"#94877B",
    rule:   uv?"rgba(77,70,114,0.62)":"rgba(128,111,100,0.40)",
    grid:   uv?"#302A4E":"#D7CCC0",
    accent: uv?"#B59BFF":"#9C3038",
    summary:uv?"#67D7C4":"#1C6673",
    warm:   uv?"#F2A65A":"#B16D28",
    alert:  uv?"#E57FA6":"#9C3038",
    panel:  uv?"#171329":"#F5EFE4"
  };
}
function orderColor(){
  const c = cols();
  if (methodKey==="reversed") return c.summary;
  if (methodKey==="shuffled") return c.warm;
  if (methodKey==="custom")   return c.alert;
  return c.accent;
}

/* ---- view -------------------------------------------------------------- */
function layout(){
  const s = Math.min(W*(W<=700?0.90:0.60), H*0.88) / VIEW.side;
  return { s:s, ox:W*0.5 - VIEW.cx*s, oy:H*0.52 + VIEW.cy*s };
}
function px(x, y, L){ return [L.ox + x*L.s, L.oy - y*L.s]; }

/* ---- field ------------------------------------------------------------- */
function chevron(c2, x, y, th, r, fill, stroke){
  c2.save();
  c2.translate(x,y);
  c2.rotate(-th);
  c2.beginPath();
  c2.moveTo(r,0);
  c2.lineTo(-r*0.72, r*0.62);
  c2.lineTo(-r*0.34, 0);
  c2.lineTo(-r*0.72, -r*0.62);
  c2.closePath();
  if (fill){ c2.fillStyle = fill; c2.fill(); }
  if (stroke){ c2.strokeStyle = stroke; c2.lineWidth = 1; c2.stroke(); }
  c2.restore();
}

function drawField(){
  const c = cols();
  const L = layout();
  ctx.setTransform(PR,0,0,PR,0,0);
  ctx.clearRect(0,0,W,H);

  /* unit frame: axes through the origin of the field */
  ctx.strokeStyle = c.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const [axL] = px(VIEW.cx - VIEW.side/2, 0, L);
  const [axR] = px(VIEW.cx + VIEW.side/2, 0, L);
  const oy0 = px(0,0,L)[1];
  ctx.moveTo(axL, oy0); ctx.lineTo(axR, oy0);
  const ox0 = px(0,0,L)[0];
  const ayT = px(0, VIEW.cy + VIEW.side/2, L)[1];
  const ayB = px(0, VIEW.cy - VIEW.side/2, L)[1];
  ctx.moveTo(ox0, ayT); ctx.lineTo(ox0, ayB);
  ctx.stroke();
  ctx.fillStyle = c.faint;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  for (const u of [-1,1,2]){
    const [tx,ty] = px(u,0,L);
    ctx.fillRect(tx-0.5, ty-4, 1, 8);
    ctx.fillText(String(u), tx-3, ty+18);
    const [vx,vy] = px(0,u,L);
    ctx.fillRect(vx-4, vy-0.5, 8, 1);
    ctx.fillText(String(u), vx+9, vy+3);
  }

  const activeLam = lam;

  /* the complete trace: every ordering's endpoint */
  if (showTrace){
    buildCloud(activeLam);
    const col = orderColor();
    for (let q=0;q<FACT;q++){
      const [sx,sy] = px(cloudXY[q*2], cloudXY[q*2+1], L);
      const hot = q===hoverQ;
      ctx.globalAlpha = hot ? 1 : 0.42;
      chevron(ctx, sx, sy, NET_TURN*DEG*activeLam, hot?5.4:3.1, hot?c.ink:col, null);
    }
    ctx.globalAlpha = 1;
  }

  /* the selected ordering's path */
  let V;
  if (seqMorph){
    const t = Math.min(1,(performance.now()-seqT0)/DUR);
    const u = reduced.matches ? 1 : ease(t);
    V = [];
    for (let k=0;k<=N;k++){
      V.push({
        x: seqFrom[k].x + (seqTo[k].x - seqFrom[k].x)*u,
        y: seqFrom[k].y + (seqTo[k].y - seqFrom[k].y)*u,
        th: seqFrom[k].th + (seqTo[k].th - seqFrom[k].th)*u
      });
    }
  } else {
    V = walk(order, activeLam);
  }

  const col = orderColor();
  const upto = playing ? playStep() : step;

  /* legs already walked */
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = col;
  ctx.beginPath();
  for (let k=0;k<=Math.floor(upto);k++){
    const [sx,sy] = px(V[k].x, V[k].y, L);
    if (k===0) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
  }
  if (upto % 1 > 0){
    const k = Math.floor(upto), f = upto % 1;
    const a = V[k], b = V[Math.min(N,k+1)];
    const [sx,sy] = px(a.x+(b.x-a.x)*f, a.y+(b.y-a.y)*f, L);
    ctx.lineTo(sx,sy);
  }
  ctx.stroke();

  /* legs not yet walked, faint */
  if (upto < N){
    ctx.setLineDash([3,5]);
    ctx.strokeStyle = c.rule;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let k=Math.floor(upto);k<=N;k++){
      const [sx,sy] = px(V[k].x, V[k].y, L);
      if (k===Math.floor(upto)) ctx.moveTo(sx,sy); else ctx.lineTo(sx,sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  /* turn arcs and vertex marks */
  for (let k=0;k<N;k++){
    const [sx,sy] = px(V[k].x, V[k].y, L);
    const from = V[k].th, to = V[k+1].th;
    const walked = k < upto;
    ctx.strokeStyle = walked ? col : c.rule;
    ctx.globalAlpha = walked ? 0.85 : 0.5;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(sx, sy, 15, -from, -to, true);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = walked ? col : c.faint;
    ctx.beginPath(); ctx.arc(sx, sy, 2.6, 0, Math.PI*2); ctx.fill();
    if (!seqMorph){
      ctx.fillStyle = walked ? c.ink : c.faint;
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.fillText(MARK[order[k]], sx+19, sy-9);
    }
  }

  /* start frame and current frame */
  const [zx,zy] = px(V[0].x, V[0].y, L);
  chevron(ctx, zx, zy, 0, 7, null, c.faint);
  const ks = Math.floor(upto), frac = upto % 1;
  let cx0, cy0, cth;
  if (frac>0 && ks<N){
    cx0 = V[ks].x + (V[ks+1].x - V[ks].x)*frac;
    cy0 = V[ks].y + (V[ks+1].y - V[ks].y)*frac;
    cth = V[ks+1].th;
  } else {
    cx0 = V[ks].x; cy0 = V[ks].y; cth = V[ks].th;
  }
  const [cxp,cyp] = px(cx0, cy0, L);
  chevron(ctx, cxp, cyp, cth, 9, col, null);
  if (upto>=N){
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cxp, cyp, 15, 0, Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* label */
  ctx.fillStyle = c.faint;
  ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const tag = morphing()
    ? (lamMorph ? "commute continuation  λ = "+lam.toFixed(3) : "reordering")
    : (commute ? "λ = 0  ·  translations only  ·  abelian" : "λ = "+lam.toFixed(2)+"  ·  turn and walk");
  ctx.fillText(tag, 16, H-14);
}

function playStep(){
  const t = (performance.now()-playT0)/PLAY_MS;
  const v = playFrom + t;
  if (v>=N){ return N; }
  return v;
}
function ease(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

/* ---- inspection plate: the commutator square --------------------------- */
function plotPair(){
  const p = Math.min(Math.max(Math.floor(step),1), N-1);
  return { p:p, i:order[p-1], j:order[p] };
}

function drawPlate(){
  const c=cols(), w=Math.max(240,plate.clientWidth || 312), narrow=w<420;
  const h=narrow?350:226, pd=Math.min(devicePixelRatio||1,2);
  plate.classList.toggle("is-narrow", narrow);
  plate.width=Math.round(w*pd); plate.height=Math.round(h*pd);
  pctx.setTransform(pd,0,0,pd,0,0);
  pctx.fillStyle=theme==="uv"?"#171329":"#F5EFE4";pctx.fillRect(0,0,w,h);
  const pr=plotPair(), i=pr.i,j=pr.j, a=walk([i,j],lam),b=walk([j,i],lam);
  const gap=commGap(i,j,lam), side=148,ox=16,oy=32;
  const P=(x,y)=>[ox+side/2+x*side/2.8,oy+side/2-y*side/2.8];
  pctx.strokeStyle=c.rule;pctx.lineWidth=1;pctx.strokeRect(ox,oy,side,side);
  pctx.beginPath();pctx.moveTo(ox,oy+side/2);pctx.lineTo(ox+side,oy+side/2);pctx.moveTo(ox+side/2,oy);pctx.lineTo(ox+side/2,oy+side);pctx.stroke();
  function path(v,col,dash){pctx.strokeStyle=col;pctx.lineWidth=2;pctx.setLineDash(dash);pctx.beginPath();v.forEach((p,k)=>{const [x,y]=P(p.x,p.y);k?pctx.lineTo(x,y):pctx.moveTo(x,y)});pctx.stroke();pctx.setLineDash([]);const [x,y]=P(v.at(-1).x,v.at(-1).y);pctx.fillStyle=col;pctx.beginPath();pctx.arc(x,y,3,0,2*Math.PI);pctx.fill();}
  path(a,c.warm,[]);path(b,c.alert,[4,3]);
  pctx.strokeStyle=c.ink;pctx.setLineDash([2,3]);pctx.beginPath();pctx.moveTo(...P(a.at(-1).x,a.at(-1).y));pctx.lineTo(...P(b.at(-1).x,b.at(-1).y));pctx.stroke();pctx.setLineDash([]);
  pctx.font="12px ui-monospace,monospace";pctx.fillStyle=c.muted;
  pctx.fillText("λ = "+lam.toFixed(2),16,18);
  pctx.fillText(MARK[i]+" → "+MARK[j]+" / "+MARK[j]+" → "+MARK[i],16,198);
  pctx.fillText("Axes −1.4 to +1.4",16,216);
  const tx=narrow?16:190,ty=narrow?246:50;
  const dia=morphing()?null:diameter(lam);
  pctx.fillStyle=c.ink;pctx.fillText("Pair gap  "+gap.toFixed(4),tx,ty);
  pctx.fillText("Spread    "+(dia===null?"—":dia.toFixed(4)),tx,ty+26);
  pctx.fillStyle=c.faint;pctx.fillText("Swap positions "+pr.p+","+(pr.p+1),tx,ty+56);
  pctx.fillText("Fixed, equal-unit axes",tx,ty+78);
}

/* ---- readout ----------------------------------------------------------- */
function orderString(o){ return o.map(k=>MARK[k].replace(/^0/,"")).join("·"); }

function updateReadout(){
  const set = (id,v)=>{ document.getElementById(id).textContent = v; };
  if (morphing()){
    set("statResidual","—"); set("statTurn","—"); set("statEnd","—"); set("statSpread","—");
    set("statLen", TOTAL_LEN.toFixed(3));
    set("statOrder", orderString(order));
    return;
  }
  const e = endOf(order, lam);
  set("statTurn", (e.th/DEG).toFixed(12)+"°");
  set("statResidual", (e.th-NET_TURN*DEG*lam).toExponential(2)+" rad");
  set("statLen", TOTAL_LEN.toFixed(3));
  set("statEnd", "("+e.x.toFixed(4)+", "+e.y.toFixed(4)+")");
  const dia = diameter(lam);
  set("statSpread", dia < 1e-9 ? "0 · one point" : dia.toFixed(4));
  set("statOrder", orderString(order));
}

function applyMeta(announce=true){
  const e = META[methodKey];
  document.getElementById("methodIndex").textContent = e.index;
  document.getElementById("methodName").textContent = e.name;
  document.getElementById("methodClaim").textContent = e.claim;
  document.getElementById("methodNote").textContent = e.note;
  const pr = plotPair();
  document.getElementById("plateTitle").textContent = "Fig. "+MARK[pr.i]+" — commutator square";
  document.getElementById("plateCaption").textContent =
    "Moves "+MARK[pr.i]+" and "+MARK[pr.j]+" in both orders from a common start. The dashed span is their gap.";
  document.getElementById("plateSide").textContent = e.plateSide;
  document.getElementById("plateKey").textContent = "λ " + lam.toFixed(2);

  document.querySelectorAll(".method-nav button").forEach(btn=>{
    const on = btn.dataset.method===methodKey;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on?"true":"false");
  });
  const tb=document.getElementById("traceBtn"), cb=document.getElementById("commuteBtn");
  tb.classList.toggle("is-active", showTrace);
  cb.classList.toggle("is-active", commute);
  tb.setAttribute("aria-pressed", showTrace?"true":"false");
  cb.setAttribute("aria-pressed", commute?"true":"false");
  document.getElementById("traceKey").classList.toggle("is-visible", showTrace);
  document.getElementById("commuteKey").classList.toggle("is-visible", commute);

  document.getElementById("lambdaIn").value = String(lam);
  document.getElementById("lambdaOut").textContent = lam.toFixed(2);
  stepIn.value = String(step);
  stepOut.textContent = "step "+step+" / "+N;
  document.getElementById("dragNote").textContent =
    showTrace ? "Click a trace point" : "Turn on Trace";

  if (announce) document.getElementById("live").textContent =
    e.name+". "+e.claim+". Order "+orderString(order)+
    ". Net turn "+(NET_TURN*lam).toFixed(0)+" degrees. Step "+step+" of "+N+".";
  document.getElementById("usePlate").classList.toggle("is-inspecting", true);
  updateReadout();
  drawPlate();
  dirty = true;
  wake();
}

/* ---- transitions ------------------------------------------------------- */
function setOrder(next, key){
  const same = next.length===order.length && next.every((v,i)=>v===order[i]);
  if (same && key===methodKey) return;
  if (!reduced.matches && !lamMorph){
    seqFrom = walk(order, lam);
    seqTo   = walk(next, lam);
    seqMorph = true; seqT0 = performance.now();
  }
  order = next.slice();
  methodKey = key;
  applyMeta();
}
function selectMethod(k){ setOrder(ORDERS[k], k); }

function setCommute(on){
  if (on===commute) return;
  commute = on;
  lamTo = on ? 0 : 1;
  if (reduced.matches){ lam = lamTo; lamMorph = false; }
  else { lamFrom = lam; lamMorph = true; lamT0 = performance.now(); }
  applyMeta();
}

function setStep(v, announce=true){
  step = Math.max(0, Math.min(N, Math.round(v)));
  playing = false;
  document.getElementById("playBtn").setAttribute("aria-pressed","false");
  document.getElementById("playBtn").textContent = "Play";
  applyMeta(announce);
}

/* ---- interaction ------------------------------------------------------- */
function hitCloud(mx, my){
  if (!showTrace) return -1;
  const L = layout();
  buildCloud(lam);
  let best=-1, bestD=11;
  for (let q=0;q<FACT;q++){
    const [sx,sy] = px(cloudXY[q*2], cloudXY[q*2+1], L);
    const d = Math.hypot(mx-sx, my-sy);
    if (d<bestD){ bestD=d; best=q; }
  }
  return best;
}

function setTheme(next){
  theme = next;
  app.classList.toggle("theme-paper", theme==="paper");
  app.classList.toggle("theme-uv", theme==="uv");
  document.getElementById("themeBtn").setAttribute("aria-label", "Switch to "+(theme==="uv"?"Paper":"UV")+" presentation");
  document.querySelector('meta[name="theme-color"]').setAttribute("content",theme==="uv"?"#0d0b18":"#e7dfd2");
  document.getElementById("paperLabel").classList.toggle("is-active", theme==="paper");
  document.getElementById("uvLabel").classList.toggle("is-active", theme==="uv");
  drawPlate();
  dirty = true;
}

function resize(){
  const r = stage.getBoundingClientRect();
  W = Math.max(1, Math.round(r.width));
  H = Math.max(1, Math.round(r.height));
  PR = Math.min(window.devicePixelRatio||1, 2);
  canvas.width = Math.floor(W*PR);
  canvas.height = Math.floor(H*PR);
  dirty = true;
  drawPlate();
  wake();
}

function loop(now){
  frameId = 0;
  if (document.hidden) return;
  if (lamMorph){
    const t = Math.min(1,(now-lamT0)/DUR);
    const u = reduced.matches ? 1 : ease(t);
    lam = lamFrom + (lamTo-lamFrom)*u;
    if (t>=1){ lam = lamTo; lamMorph = false; updateReadout(); drawPlate(); applyMeta(false); }
    dirty = true;
  }
  if (seqMorph){
    const t = Math.min(1,(now-seqT0)/DUR);
    if (t>=1){ seqMorph = false; updateReadout(); drawPlate(); }
    dirty = true;
  }
  if (playing){
    const v = playStep();
    if (v>=N){ playing=false; step=N;
      document.getElementById("playBtn").setAttribute("aria-pressed","false");
      document.getElementById("playBtn").textContent = "Play";
      applyMeta();
    }
    dirty = true;
  }
  if (dirty){ drawField(); dirty = false; }
  if (lamMorph || seqMorph || playing) wake();
}

/* ---- wiring ------------------------------------------------------------ */
document.getElementById("themeBtn").addEventListener("click", ()=>setTheme(theme==="uv"?"paper":"uv"));
document.querySelectorAll(".method-nav button").forEach(btn=>{
  btn.addEventListener("click", ()=>selectMethod(btn.dataset.method));
});
document.getElementById("traceBtn").addEventListener("click", ()=>{ showTrace=!showTrace; hoverQ=-1; applyMeta(); });
document.getElementById("commuteBtn").addEventListener("click", ()=>setCommute(!commute));
document.getElementById("playBtn").addEventListener("click", ()=>{
  const b = document.getElementById("playBtn");
  if (playing){ playing=false; b.setAttribute("aria-pressed","false"); b.textContent="Play"; applyMeta(); return; }
  playing = true; playFrom = (step>=N?0:step); playT0 = performance.now();
  b.setAttribute("aria-pressed","true"); b.textContent="Pause";
  dirty = true;
});
document.getElementById("lambdaIn").addEventListener("input", ev=>{
  lam=Number(ev.target.value); lamTo=lam; lamMorph=false; seqMorph=false;
  commute=lam===0; dirty=true; applyMeta(false);
});
document.getElementById("lambdaIn").addEventListener("change", ()=>applyMeta());
stepIn.addEventListener("input", ()=>setStep(Number(stepIn.value), false));
stepIn.addEventListener("change", ()=>applyMeta());

stage.addEventListener("pointermove", ev=>{
  if (ev.target.closest("button,a,input,.use-plate,.study-tools,.method-nav,.step-row,.lambda-row")) return;
  const r = canvas.getBoundingClientRect();
  const q = hitCloud(ev.clientX-r.left, ev.clientY-r.top);
  if (q!==hoverQ){
    hoverQ = q;
    document.getElementById("dragNote").textContent =
      q>=0 ? ("Trace "+orderString(PERMS[q])) : (showTrace?"Click a trace point":"Turn on Trace");
    dirty = true;
  }
});
stage.addEventListener("pointerdown", ev=>{
  if (ev.target.closest("button,a,input,select,textarea,.use-plate,.study-tools,.method-nav,.step-row,.lambda-row")) return;
  canvas.focus({preventScroll:true});
  const r = canvas.getBoundingClientRect();
  const q = hitCloud(ev.clientX-r.left, ev.clientY-r.top);
  if (q<0) return;
  const p = PERMS[q];
  let key = "custom";
  for (const k of ["given","reversed","shuffled"]){
    if (ORDERS[k].every((v,i)=>v===p[i])) key = k;
  }
  setOrder(p, key);
});

window.addEventListener("keydown", ev=>{
  if (ev.defaultPrevented||ev.repeat||ev.metaKey||ev.ctrlKey||ev.altKey) return;
  if (ev.target.isContentEditable || ev.target.closest?.("input,textarea,select,button,a,summary,[contenteditable]")) return;
  const k = ev.key;
  if ((k==="ArrowLeft" || k==="ArrowRight") && ev.target===canvas){
    ev.preventDefault();
    showTrace=true;
    const delta=(k==="ArrowLeft"?-1:1)*(ev.shiftKey?10:1);
    const at=PERM_AT.get(order.join(""));
    const q=(at+delta+FACT)%FACT;
    hoverQ=q;
    const selected=PERMS[q];
    const key=Object.keys(ORDERS).find(name=>ORDERS[name].every((v,i)=>v===selected[i]))||"custom";
    setOrder(selected,key);
    return;
  }
  if (k==="1") selectMethod("given");
  else if (k==="2") selectMethod("reversed");
  else if (k==="3") selectMethod("shuffled");
  else if (k==="t"||k==="T") setTheme(theme==="uv"?"paper":"uv");
  else if (k==="r"||k==="R"){ showTrace=!showTrace; hoverQ=-1; applyMeta(); }
  else if (k==="c"||k==="C") setCommute(!commute);
  else if (k===" "){ ev.preventDefault(); document.getElementById("playBtn").click(); }
  else if (k==="["){ setStep(step-1); }
  else if (k==="]"){ setStep(step+1); }
});
window.addEventListener("resize", resize);
for (const name of ["click","input","keydown","pointermove"]) document.addEventListener(name,wake);
document.addEventListener("visibilitychange",()=>{
  if (document.hidden){hiddenAt=performance.now();cancelAnimationFrame(frameId);frameId=0;}
  else {
    const elapsed=hiddenAt?performance.now()-hiddenAt:0;
    lamT0+=elapsed;seqT0+=elapsed;playT0+=elapsed;hiddenAt=0;dirty=true;wake();
  }
});
reduced.addEventListener("change",()=>{
  if (reduced.matches){lam=lamTo;lamMorph=false;seqMorph=false;if(playing)setStep(N,false);applyMeta(false);}
});

resize();
document.getElementById("movesChecksum").textContent =
  "6 moves · 720 orderings";
setTheme("uv");
applyMeta(false);
loader.classList.add("is-hidden");
stage.setAttribute("aria-busy","false");
wake();
}
I();

  
