
const NELX = 56, NELY = 28, PAD = 3;
const VOLFRAC = 0.4, PENAL = 3, RMIN = 1.8;
const E0 = 1, EMIN = 1e-4, K0 = 1, KMIN = 1e-3, NU = 0.3;
const MOVE = 0.15, XMIN = 1e-3, MAX_ITER = 80, CG_TOL = 2e-4, CG_MAX = 1400;
const CHANGE_TOL = 0.015, MIN_SETTLE = 24, OBJ_FLAT = 2.5e-4;

const OBLIGATION_META = {
  carry: {
    index: "01", name: "Carry", claim: "Load path",
    note: "The budget spends itself making a path from the support to the force. Here, only mechanical compliance judges it.",
    plateTitle: "Fig. 01 — carry cell", plateCaption: "A specialist for the force.", plateSide: "support · load"
  },
  conduct: {
    index: "02", name: "Conduct", claim: "Source to sink",
    note: "The same budget connects heat to the sink. Here, only thermal compliance judges it.",
    plateTitle: "Fig. 02 — conduct cell", plateCaption: "A specialist for the heat.", plateSide: "source · sink"
  },
  share: {
    index: "03", name: "Share", claim: "50 / 50 normalized",
    note: "Equal weight on normalized mechanical and thermal compliance.",
    plateTitle: "Fig. 03 — share cell", plateCaption: "A frozen 50 / 50 scalarization.", plateSide: "both operators"
  }
};

const OBLIGATION_WORKER_SRC = './assets/volume-obligations.worker.js';

const STRUCT_VOLFRAC = 0.4;
const STRUCT_PENAL = 3;
const STRUCT_RMIN = 1.6;
const STRUCT_E0 = 1;
const STRUCT_EMIN = 1e-6;
const STRUCT_XMIN = 1e-3;

const STRUCT_MESH = {
  cantilever: { nelx: 64, nely: 32, cut: 0 },
  mbb: { nelx: 72, nely: 24, cut: 0 },
  lbracket: { nelx: 40, nely: 40, cut: 16 }
};

const STRUCTURAL_META = {
  cantilever: {
    index: "01", name: "Cantilever", claim: "Wall to tip",
    note: "Fixed left wall. A downward force at the free corner. The same designable fraction forms a path between them.",
    plateTitle: "Fig. A1 — filter neighborhood", plateCaption: "Physical filter on one element.", plateSide: "wall · tip load"
  },
  mbb: {
    index: "02", name: "MBB", claim: "Half beam",
    note: "A symmetry wall, a far roller, and a midspan load. The same designable fraction forms a bridge on half a beam.",
    plateTitle: "Fig. A2 — filter neighborhood", plateCaption: "Physical filter on one element.", plateSide: "symmetry · roller"
  },
  lbracket: {
    index: "03", name: "L-bracket", claim: "Cut field",
    note: "The same designable fraction, with a missing corner. The force turns; the material turns with it.",
    plateTitle: "Fig. A3 — filter neighborhood", plateCaption: "Physical filter on one element.", plateSide: "passive cut"
  }
};

const STRUCTURAL_WORKER_SRC = './assets/volume-structural.worker.js';


function hexToRgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function lerp3(a,b,t){return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];}
function ease(t){return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;}
function fmtRatio(x){
  if (!isFinite(x) || x<=0) return "—";
  if (x>=100) return Math.round(x) + "×";
  if (x>=10) return x.toFixed(1) + "×";
  return x.toFixed(2);
}

function I(){
  const app=document.getElementById("app");
  const stage=document.getElementById("stage");
  const canvas=document.getElementById("field");
  const ctx=canvas.getContext("2d",{alpha:true});
  const plate=document.getElementById("plate");
  const pctx=plate.getContext("2d");
  const usePlate=document.getElementById("usePlate");
  const loader=document.getElementById("loader");
  const loaderText=document.getElementById("loaderText");
  const fallback=document.getElementById("fallback");
  const themeBtn=document.getElementById("themeBtn");
  const studyModeBtn=document.getElementById("studyModeBtn");
  const nav=document.querySelector(".method-nav");
  const tools=document.querySelector(".study-tools");
  const keys=document.querySelector(".field-keys");
  const stats=document.querySelector(".method-reading dl");
  const themeColor=document.querySelector('meta[name="theme-color"]');
  const description=document.querySelector('meta[name="description"]');
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact=window.matchMedia("(max-width: 700px)");

  if(!ctx||!pctx||typeof Worker==="undefined"){
    loader.classList.add("is-hidden");
    loader.setAttribute("aria-hidden","true");
    fallback.hidden=false;
    return;
  }

  let theme="uv";
  let studyMode="obligations";
  let obligationMethod="carry";
  let structuralMethod="cantilever";
  let showLoad=false,showHeat=false,showEnergy=false,showDeflect=false;
  let pin=-1,hover=-1;
  let W=1,H=1,PR=1;
  let worker=null,workerUrl="",workerMode="",runId=0;
  let primaryComplete=false,forming=false,primaryFailure=false;
  let activeClaim="carry",activeIteration=0;
  let mix=1,morphing=false,morphT0=0,morphFrom="carry",morphTo="carry";
  const MORPH_DURATION=1100;
  let frameHandle=0;

  const fields={carry:null,conduct:null,share:null};
  const refs={CmStar:0,CtStar:0};
  const structuralCache={cantilever:null,mbb:null,lbracket:null};
  const structuralState={
    kind:"cantilever",nelx:64,nely:32,cut:0,nActive:64*32,
    rho:null,ce:null,U:null,iter:0,C:0,C0:1,vol:STRUCT_VOLFRAC,gray:0.96
  };

  function css(){return getComputedStyle(app);}
  function readColors(){
    const s=css();
    return {
      field:s.getPropertyValue("--field").trim(),
      ink:s.getPropertyValue("--ink").trim(),
      muted:s.getPropertyValue("--ink-muted").trim(),
      faint:s.getPropertyValue("--ink-faint").trim(),
      rule:s.getPropertyValue("--rule").trim(),
      accent:s.getPropertyValue("--accent").trim(),
      summary:s.getPropertyValue("--summary").trim(),
      warm:s.getPropertyValue("--warm").trim(),
      alert:s.getPropertyValue("--alert").trim(),
      solid:s.getPropertyValue("--solid").trim(),
      voidc:s.getPropertyValue("--void").trim()
    };
  }

  function isPassive(kind,i,j,nelx,nely,cut){
    return kind==="lbracket"&&i>=nelx-cut&&j>=nely-cut;
  }

  function seedStructural(kind){
    const m=STRUCT_MESH[kind];
    const n=m.nelx*m.nely;
    const rho=new Float32Array(n);
    let nActive=0;
    for(let i=0;i<m.nelx;i++) for(let j=0;j<m.nely;j++){
      const e=i*m.nely+j;
      if(isPassive(kind,i,j,m.nelx,m.nely,m.cut)) rho[e]=STRUCT_XMIN;
      else{rho[e]=STRUCT_VOLFRAC;nActive++;}
    }
    Object.assign(structuralState,{
      kind,nelx:m.nelx,nely:m.nely,cut:m.cut,nActive,
      rho,ce:new Float32Array(n),U:new Float32Array((m.nelx+1)*(m.nely+1)*2),
      iter:0,C:0,C0:1,vol:STRUCT_VOLFRAC,gray:4*STRUCT_VOLFRAC*(1-STRUCT_VOLFRAC)
    });
  }

  function restoreStructural(saved){
    if(!saved)return false;
    Object.assign(structuralState,saved);
    return true;
  }

  function fieldRect() {
    if(document.documentElement.classList.contains("mobile-reading"))return {x:22,y:24,w:W-44,h:H-48};
    const stageBox=stage.getBoundingClientRect();
    const header=document.querySelector(".study-header").getBoundingClientRect();
    const reading=document.querySelector(".method-reading").getBoundingClientRect();
    const tools=document.querySelector(".study-tools").getBoundingClientRect();
    // Reserve the inset column even when its contents are hidden, keeping axes fixed.
    const left=Math.min(72,Math.max(20,W*.046))+Math.min(312,W*.28)+24;
    const right=reading.left-stageBox.left-24;
    const top=header.bottom-stageBox.top+24;
    const bottom=tools.top-stageBox.top-24;
    return {x:left,y:top,w:Math.max(48,right-left),h:Math.max(48,bottom-top)};
  }

  function obligationLayout(){
    const r=fieldRect();
    const s=Math.min(r.w/NELX,r.h/NELY)*0.96;
    const dw=NELX*s,dh=NELY*s;
    return{s,dw,dh,x:r.x+(r.w-dw)/2,y:r.y+(r.h-dh)/2,nelx:NELX,nely:NELY};
  }

  function structuralLayout(){
    const r=fieldRect();
    const s=Math.min(r.w/structuralState.nelx,r.h/structuralState.nely)*0.96;
    const dw=structuralState.nelx*s,dh=structuralState.nely*s;
    return{s,dw,dh,x:r.x+(r.w-dw)/2,y:r.y+(r.h-dh)/2,nelx:structuralState.nelx,nely:structuralState.nely};
  }

  function obligationNodeXY(i,j,L){return[L.x+i*L.s,L.y+(NELY-j)*L.s];}

  function structuralNodeXY(i,j,L,scale){
    const n=i*(structuralState.nely+1)+j;
    let x=L.x+i*L.s;
    let y=L.y+(structuralState.nely-j)*L.s;
    if(showDeflect&&structuralState.U&&scale){
      x+=structuralState.U[n*2]*scale;
      y-=structuralState.U[n*2+1]*scale;
    }
    return[x,y];
  }

  function currentObligation(){return fields[obligationMethod]||null;}

  function displayObligation(){
    if(morphing&&fields[morphFrom]&&fields[morphTo]&&fields[morphFrom].rho&&fields[morphTo].rho){
      const a=fields[morphFrom],b=fields[morphTo];
      const t=reduced.matches?1:ease(mix);
      const rho=new Float32Array(a.rho.length);
      for(let e=0;e<rho.length;e++)rho[e]=a.rho[e]+(b.rho[e]-a.rho[e])*t;
      return{rho,presentation:true,dest:b};
    }
    const view=currentObligation();
    if(reduced.matches&&view&&!view.settled)return null;
    return view;
  }

  function energyNorms(view,kind){
    let maxE=1e-12;
    if(!view)return{maxE,logMax:0};
    const ce=kind==="heat"?view.ceT:view.ceM;
    if(!ce)return{maxE,logMax:0};
    const lo=kind==="heat"?KMIN:EMIN;
    const hi=kind==="heat"?K0:E0;
    for(let e=0;e<view.rho.length;e++){
      const mat=lo+Math.pow(view.rho[e],PENAL)*(hi-lo);
      maxE=Math.max(maxE,mat*ce[e]);
    }
    return{maxE,logMax:Math.log(1+maxE)};
  }

  function drawTag(text,x,y,color,align){
    ctx.save();
    ctx.fillStyle=color;
    ctx.globalAlpha=.82;
    ctx.font="9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign=align||"left";
    ctx.fillText(text,x,y);
    ctx.restore();
  }

  function drawObligationPatches(col,L){
    const pads=[
      {i0:0,j0:0,i1:PAD,j1:PAD,kind:"support"},
      {i0:NELX-PAD,j0:NELY-PAD,i1:NELX,j1:NELY,kind:"load"},
      {i0:NELX-PAD,j0:0,i1:NELX,j1:PAD,kind:"source"},
      {i0:0,j0:NELY-PAD,i1:PAD,j1:NELY,kind:"sink"}
    ];
    ctx.save();
    for(const p of pads){
      const a=obligationNodeXY(p.i0,p.j1,L);
      const b=obligationNodeXY(p.i1,p.j0,L);
      if(p.kind==="support")ctx.strokeStyle=col.ink;
      else if(p.kind==="load")ctx.strokeStyle=col.warm;
      else if(p.kind==="source")ctx.strokeStyle=col.alert;
      else ctx.strokeStyle=col.summary;
      ctx.globalAlpha=.9;
      ctx.lineWidth=Math.max(1.1,Math.min(1.6,L.s*.13));
      ctx.strokeRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);
    }
    const mark=Math.max(7,Math.min(11,L.s*.7));
    const arrow=Math.max(17,Math.min(25,L.s*1.55));
    const head=Math.max(4,Math.min(6,L.s*.4));
    const load=obligationNodeXY(NELX,NELY,L);
    ctx.strokeStyle=col.warm;ctx.globalAlpha=.95;
    ctx.beginPath();ctx.moveTo(load[0],load[1]);ctx.lineTo(load[0],load[1]+arrow);ctx.stroke();
    ctx.beginPath();ctx.moveTo(load[0]-head,load[1]+arrow-head);ctx.lineTo(load[0],load[1]+arrow);ctx.lineTo(load[0]+head,load[1]+arrow-head);ctx.stroke();
    const fix=obligationNodeXY(0,0,L);
    ctx.strokeStyle=col.ink;ctx.globalAlpha=.65;
    for(let k=0;k<=4;k++){
      const y=fix[1]-k*(PAD*L.s)/4;
      ctx.beginPath();ctx.moveTo(fix[0],y);ctx.lineTo(fix[0]-mark,y+mark*.7);ctx.stroke();
    }
    ctx.restore();
    const sink=obligationNodeXY(0,NELY,L);
    const source=obligationNodeXY(NELX,0,L);
    drawTag("SINK",sink[0]+5,sink[1]-7,col.summary,"left");
    drawTag("FORCE",load[0]-5,load[1]-7,col.warm,"right");
    drawTag("FIX",fix[0]+5,fix[1]-7,col.ink,"left");
    drawTag("SOURCE",source[0]-5,source[1]+14,col.alert,"right");
  }

  function drawObligationField(){
    const col=readColors();
    const view=displayObligation();
    const L=obligationLayout();
    ctx.save();
    ctx.fillStyle=theme==="uv"?"rgba(18,16,34,0.78)":"rgba(245,239,228,0.62)";
    ctx.fillRect(L.x,L.y,L.dw,L.dh);
    ctx.strokeStyle=col.rule;ctx.lineWidth=1;ctx.globalAlpha=.7;
    ctx.strokeRect(L.x-.5,L.y-.5,L.dw+1,L.dh+1);
    ctx.globalAlpha=1;
    const solid=hexToRgb(col.solid),voidc=hexToRgb(col.voidc);
    const alert=hexToRgb(col.alert),summary=hexToRgb(col.summary),warm=hexToRgb(col.warm);
    const allowPhys=view&&view.ceM&&view.ceT&&!view.presentation;
    const enM=showLoad&&allowPhys?energyNorms(view,"load"):null;
    const enT=showHeat&&allowPhys?energyNorms(view,"heat"):null;
    if(view&&view.rho)for(let i=0;i<NELX;i++)for(let j=0;j<NELY;j++){
      const e=i*NELY+j,r=view.rho[e];
      let rgb=lerp3(voidc,solid,Math.max(0,Math.min(1,r)));
      if(allowPhys&&showLoad){
        const E=EMIN+Math.pow(r,PENAL)*(E0-EMIN);
        const t=Math.min(1,Math.log(1+E*view.ceM[e])/Math.max(1e-6,enM.logMax));
        const hot=t>.55?lerp3(warm,alert,(t-.55)/.45):lerp3(rgb,warm,t/.55);
        rgb=lerp3(rgb,hot,.72*t);
      }
      if(allowPhys&&showHeat){
        const K=KMIN+Math.pow(r,PENAL)*(K0-KMIN);
        const t=Math.min(1,Math.log(1+K*view.ceT[e])/Math.max(1e-6,enT.logMax));
        const cool=t>.55?lerp3(summary,alert,(t-.55)/.45):lerp3(rgb,summary,t/.55);
        rgb=lerp3(rgb,cool,.70*t);
      }
      const a=theme==="uv"?.28+.72*Math.pow(r,.85):.30+.70*Math.pow(r,.85);
      ctx.fillStyle="rgba("+(rgb[0]|0)+","+(rgb[1]|0)+","+(rgb[2]|0)+","+a.toFixed(3)+")";
      const p00=obligationNodeXY(i,j,L),p10=obligationNodeXY(i+1,j,L);
      const p11=obligationNodeXY(i+1,j+1,L),p01=obligationNodeXY(i,j+1,L);
      ctx.beginPath();ctx.moveTo(p00[0],p00[1]);ctx.lineTo(p10[0],p10[1]);ctx.lineTo(p11[0],p11[1]);ctx.lineTo(p01[0],p01[1]);ctx.closePath();ctx.fill();
    }
    drawObligationPatches(col,L);
    drawSelection(col,L,"obligations",0);
    ctx.restore();
  }

  function structuralDeflectScale(L){
    if(!structuralState.U)return 0;
    let m=0;
    for(let k=0;k<structuralState.U.length;k+=2)m=Math.max(m,Math.hypot(structuralState.U[k],structuralState.U[k+1]));
    return m<1e-12?0:(.11*L.dh)/m;
  }

  function structuralEnergyNorm(){
    let maxE=1e-12;
    if(!structuralState.rho||!structuralState.ce)return{logMax:0};
    for(let e=0;e<structuralState.rho.length;e++){
      const E=STRUCT_EMIN+Math.pow(structuralState.rho[e],STRUCT_PENAL)*(STRUCT_E0-STRUCT_EMIN);
      maxE=Math.max(maxE,E*structuralState.ce[e]);
    }
    return{logMax:Math.log(1+maxE)};
  }

  function drawStructuralSupports(col,L){
    const kind=structuralState.kind,nelx=structuralState.nelx,nely=structuralState.nely,cut=structuralState.cut;
    const support=Math.max(7,Math.min(10,L.s*.65));
    const arrow=Math.max(16,Math.min(22,L.s*1.45));
    const head=Math.max(4,Math.min(6,L.s*.4));
    ctx.save();ctx.strokeStyle=col.ink;ctx.lineWidth=Math.max(1.2,Math.min(1.7,L.s*.13));ctx.globalAlpha=.82;
    if(kind==="cantilever"){
      for(let k=0;k<=6;k++){const y=L.y+k/6*L.dh;ctx.beginPath();ctx.moveTo(L.x,y);ctx.lineTo(L.x-support,y+support*.7);ctx.stroke();}
      const lx=L.x+L.dw,ly=L.y+L.dh;
      ctx.strokeStyle=col.warm;ctx.globalAlpha=.95;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx,ly+arrow);ctx.stroke();
      ctx.beginPath();ctx.moveTo(lx-head,ly+arrow-head);ctx.lineTo(lx,ly+arrow);ctx.lineTo(lx+head,ly+arrow-head);ctx.stroke();
      drawTag("FIX",L.x+5,L.y+12,col.ink,"left");drawTag("FORCE",lx-5,ly-7,col.warm,"right");
    }else if(kind==="mbb"){
      ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(L.x,L.y+L.dh);ctx.stroke();
      const rx=L.x+L.dw,ry=L.y+L.dh;
      ctx.beginPath();ctx.moveTo(rx-support*.75,ry+support*.75);ctx.lineTo(rx,ry);ctx.lineTo(rx+support*.75,ry+support*.75);ctx.stroke();
      ctx.strokeStyle=col.warm;
      ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(L.x,L.y+arrow);ctx.stroke();
      ctx.beginPath();ctx.moveTo(L.x-head,L.y+arrow-head);ctx.lineTo(L.x,L.y+arrow);ctx.lineTo(L.x+head,L.y+arrow-head);ctx.stroke();
      drawTag("SYMMETRY",L.x+5,L.y+12,col.ink,"left");drawTag("FORCE",L.x+5,L.y+arrow+11,col.warm,"left");drawTag("ROLLER",rx-5,ry-7,col.ink,"right");
    }else{
      const xArm=L.x+(nelx-cut)*L.s;
      ctx.beginPath();ctx.moveTo(L.x,L.y);ctx.lineTo(xArm,L.y);ctx.stroke();
      for(let k=0;k<=4;k++){const x=L.x+k/4*(xArm-L.x);ctx.beginPath();ctx.moveTo(x,L.y);ctx.lineTo(x-support*.55,L.y-support);ctx.stroke();}
      const lx=L.x+L.dw,ly=L.y+cut*L.s;
      ctx.strokeStyle=col.warm;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx,ly+arrow);ctx.stroke();
      ctx.beginPath();ctx.moveTo(lx-head,ly+arrow-head);ctx.lineTo(lx,ly+arrow);ctx.lineTo(lx+head,ly+arrow-head);ctx.stroke();
      drawTag("FIX",L.x+5,L.y+12,col.ink,"left");drawTag("FORCE",lx-5,ly-7,col.warm,"right");
    }
    ctx.restore();
  }

  function drawStructuralField(){
    const col=readColors();
    const L=structuralLayout();
    const sc=showDeflect?structuralDeflectScale(L):0;
    const en=structuralEnergyNorm();
    const solid=hexToRgb(col.solid),voidc=hexToRgb(col.voidc),alert=hexToRgb(col.alert),warm=hexToRgb(col.warm);
    const s=structuralState;
    ctx.save();
    ctx.fillStyle=theme==="uv"?"rgba(18,16,34,0.78)":"rgba(245,239,228,0.62)";
    ctx.fillRect(L.x,L.y,L.dw,L.dh);
    ctx.strokeStyle=col.rule;ctx.lineWidth=1;ctx.globalAlpha=.7;ctx.strokeRect(L.x-.5,L.y-.5,L.dw+1,L.dh+1);ctx.globalAlpha=1;
    if(s.rho&&!(reduced.matches&&forming))for(let i=0;i<s.nelx;i++)for(let j=0;j<s.nely;j++){
      if(isPassive(s.kind,i,j,s.nelx,s.nely,s.cut))continue;
      const e=i*s.nely+j,r=s.rho[e];
      let rgb=lerp3(voidc,solid,Math.max(0,Math.min(1,r)));
      if(showEnergy&&s.ce){
        const E=STRUCT_EMIN+Math.pow(r,STRUCT_PENAL)*(STRUCT_E0-STRUCT_EMIN);
        const t=Math.min(1,Math.log(1+E*s.ce[e])/Math.max(1e-6,en.logMax));
        const hot=t>.55?lerp3(warm,alert,(t-.55)/.45):lerp3(rgb,warm,t/.55);
        rgb=lerp3(rgb,hot,.72*t);
      }
      const a=theme==="uv"?.28+.72*Math.pow(r,.85):.30+.70*Math.pow(r,.85);
      ctx.fillStyle="rgba("+(rgb[0]|0)+","+(rgb[1]|0)+","+(rgb[2]|0)+","+a.toFixed(3)+")";
      const p00=structuralNodeXY(i,j,L,sc),p10=structuralNodeXY(i+1,j,L,sc);
      const p11=structuralNodeXY(i+1,j+1,L,sc),p01=structuralNodeXY(i,j+1,L,sc);
      ctx.beginPath();ctx.moveTo(p00[0],p00[1]);ctx.lineTo(p10[0],p10[1]);ctx.lineTo(p11[0],p11[1]);ctx.lineTo(p01[0],p01[1]);ctx.closePath();ctx.fill();
    }
    if(s.kind==="lbracket"){
      ctx.strokeStyle=col.rule;ctx.lineWidth=1;ctx.globalAlpha=.55;
      const xC=L.x+(s.nelx-s.cut)*L.s,yC=L.y+s.cut*L.s;
      ctx.beginPath();ctx.moveTo(xC,L.y);ctx.lineTo(L.x+L.dw,L.y);ctx.lineTo(L.x+L.dw,yC);ctx.lineTo(xC,yC);ctx.closePath();ctx.stroke();ctx.globalAlpha=1;
    }
    drawStructuralSupports(col,L);
    drawSelection(col,L,"appendix",sc);
    ctx.restore();
  }

  function drawSelection(col,L,mode,sc){
    const idx=pin>=0?pin:hover;
    if(idx<0)return;
    const nely=mode==="obligations"?NELY:structuralState.nely;
    const i=Math.floor(idx/nely),j=idx%nely;
    const xy=mode==="obligations"?obligationNodeXY:((ii,jj,ll)=>structuralNodeXY(ii,jj,ll,sc));
    const a=xy(i,j,L),b=xy(i+1,j,L),c=xy(i+1,j+1,L),d=xy(i,j+1,L);
    ctx.save();ctx.strokeStyle=pin>=0?col.accent:col.warm;ctx.lineWidth=pin>=0?1.6:1;ctx.globalAlpha=.95;
    ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.lineTo(c[0],c[1]);ctx.lineTo(d[0],d[1]);ctx.closePath();ctx.stroke();ctx.restore();
  }

  function drawField(){
    ctx.setTransform(PR,0,0,PR,0,0);
    ctx.clearRect(0,0,W,H);
    if(studyMode==="obligations")drawObligationField();else drawStructuralField();
  }

  function drawPlateFrame(col){
    const w=plate.width,h=plate.height;
    pctx.setTransform(1,0,0,1,0,0);pctx.clearRect(0,0,w,h);
    pctx.fillStyle=theme==="uv"?"#171329":"#F5EFE4";pctx.fillRect(0,0,w,h);
    pctx.strokeStyle=theme==="uv"?"rgba(77,70,114,0.55)":"rgba(128,111,100,0.38)";pctx.strokeRect(.5,.5,w-1,h-1);
    pctx.font="9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  }

  function plateBar(col,barX,barW,y,label,val,color){
    pctx.fillStyle=col.faint;pctx.fillText(label,barX,y);
    pctx.fillStyle=theme==="uv"?"#2a2542":"#d7ccc0";pctx.fillRect(barX,y+8,barW,8);
    pctx.fillStyle=color;pctx.fillRect(barX,y+8,Math.max(1,barW*Math.min(1,Math.max(0,val))),8);
    pctx.fillStyle=col.muted;pctx.fillText(val.toFixed(3),barX+barW-36,y);
  }

  function drawObligationPlate(){
    const col=readColors();drawPlateFrame(col);
    const view=displayObligation(),phys=view&&view.presentation?null:view;
    const idx=pin>=0?pin:hover>=0?hover:Math.floor(NELX*.5)*NELY+Math.floor(NELY*.5);
    const ei=Math.max(0,Math.min(NELX-1,Math.floor(idx/NELY))),ej=Math.max(0,Math.min(NELY-1,idx%NELY)),e=ei*NELY+ej;
    const rInt=Math.ceil(RMIN),cell=Math.min(18,Math.floor(168/(2*rInt+3))),gx=18,gy=28;
    const solid=hexToRgb(col.solid),voidc=hexToRgb(col.voidc);
    pctx.fillStyle=col.faint;pctx.fillText("Hij  ·  rmin = 1.8 h",gx,16);
    const rho=view&&view.rho;
    for(let di=-rInt;di<=rInt;di++)for(let dj=-rInt;dj<=rInt;dj++){
      const ii=ei+di,jj=ej+dj,x=gx+(di+rInt)*cell,y=gy+(rInt-dj)*cell,dist=Math.hypot(di,dj);
      const inside=dist<=RMIN+1e-9,pass=ii<0||jj<0||ii>=NELX||jj>=NELY;
      pctx.fillStyle=pass?(theme==="uv"?"#120f20":"#ddd4c6"):(theme==="uv"?"#1c1830":"#efe7d8");pctx.fillRect(x,y,cell-1,cell-1);
      if(!pass&&rho){
        const rr=rho[ii*NELY+jj],rgb=lerp3(voidc,solid,rr),hij=inside?Math.max(0,RMIN-dist)/RMIN:0;
        pctx.fillStyle="rgba("+(rgb[0]|0)+","+(rgb[1]|0)+","+(rgb[2]|0)+","+(0.2+.75*rr)+")";pctx.fillRect(x,y,cell-1,cell-1);
        if(hij>0){pctx.strokeStyle=col.summary;pctx.globalAlpha=.25+.75*hij;pctx.strokeRect(x+.5,y+.5,cell-2,cell-2);pctx.globalAlpha=1;}
      }
      if(di===0&&dj===0){pctx.strokeStyle=col.accent;pctx.lineWidth=1.4;pctx.strokeRect(x+.5,y+.5,cell-2,cell-2);pctx.lineWidth=1;}
    }
    const cx=gx+rInt*cell+cell*.5,cy=gy+rInt*cell+cell*.5;
    pctx.strokeStyle=col.summary;pctx.globalAlpha=.55;pctx.beginPath();pctx.arc(cx,cy,RMIN*cell,0,Math.PI*2);pctx.stroke();pctx.globalAlpha=1;
    const barX=gx+(2*rInt+1)*cell+28,barW=plate.width-barX-24;
    const rhoVal=rho?rho[e]:VOLFRAC,Em=EMIN+Math.pow(rhoVal,PENAL)*(E0-EMIN),Kt=KMIN+Math.pow(rhoVal,PENAL)*(K0-KMIN);
    const workM=phys&&phys.ceM?Em*phys.ceM[e]:0,workT=phys&&phys.ceT?Kt*phys.ceT[e]:0;
    let maxM=workM,maxT=workT;
    if(phys&&phys.ceM)for(let k=0;k<phys.rho.length;k++){
      const ek=EMIN+Math.pow(phys.rho[k],PENAL)*(E0-EMIN),kk=KMIN+Math.pow(phys.rho[k],PENAL)*(K0-KMIN);
      maxM=Math.max(maxM,ek*phys.ceM[k]);maxT=Math.max(maxT,kk*phys.ceT[k]);
    }
    const mech=phys&&maxM>0?workM/maxM:0,therm=phys&&maxT>0?workT/maxT:0;
    plateBar(col,barX,barW,36,"density ρ",rhoVal,col.accent);
    plateBar(col,barX,barW,78,"mech compliance contrib.",mech,col.alert);
    plateBar(col,barX,barW,120,"relative therm diss.",therm,col.summary);
    pctx.fillStyle=col.faint;pctx.fillText("elem "+ei+","+ej+((ei<PAD||ei>=NELX-PAD)&&(ej<PAD||ej>=NELY-PAD)?"  pad":""),barX,168);
    const fieldState=view&&view.presentation?"density morph · not a solve":view&&view.settled?"p = 3   completed field":"p = 3   forming field";
    pctx.fillText(fieldState,barX,186);
    usePlate.setAttribute("aria-label","Filter neighborhood for element "+ei+", "+ej+". Density "+rhoVal.toFixed(3)+". Mechanical compliance contribution "+mech.toFixed(3)+". Relative thermal dissipation "+therm.toFixed(3)+".");
  }

  function drawStructuralPlate(){
    const col=readColors();drawPlateFrame(col);
    const s=structuralState;
    const idx=pin>=0?pin:hover>=0?hover:Math.floor(s.nelx*.55)*s.nely+Math.floor(s.nely*.45);
    const ei=Math.max(0,Math.min(s.nelx-1,Math.floor(idx/s.nely))),ej=Math.max(0,Math.min(s.nely-1,idx%s.nely)),e=ei*s.nely+ej;
    const rInt=Math.ceil(STRUCT_RMIN),cell=Math.min(18,Math.floor(168/(2*rInt+3))),gridN=2*rInt+1,gx=18,gy=28;
    const solid=hexToRgb(col.solid),voidc=hexToRgb(col.voidc);
    pctx.fillStyle=col.faint;pctx.fillText("Hij  ·  rmin = 1.6 h",gx,16);
    for(let di=-rInt;di<=rInt;di++)for(let dj=-rInt;dj<=rInt;dj++){
      const ii=ei+di,jj=ej+dj,x=gx+(di+rInt)*cell,y=gy+(rInt-dj)*cell,dist=Math.hypot(di,dj);
      const inside=dist<=STRUCT_RMIN+1e-9,pass=ii<0||jj<0||ii>=s.nelx||jj>=s.nely||isPassive(s.kind,ii,jj,s.nelx,s.nely,s.cut);
      pctx.fillStyle=pass?(theme==="uv"?"#120f20":"#ddd4c6"):(theme==="uv"?"#1c1830":"#efe7d8");pctx.fillRect(x,y,cell-1,cell-1);
      if(!pass&&s.rho){
        const rr=s.rho[ii*s.nely+jj],rgb=lerp3(voidc,solid,rr),hij=inside?Math.max(0,STRUCT_RMIN-dist)/STRUCT_RMIN:0;
        pctx.fillStyle="rgba("+(rgb[0]|0)+","+(rgb[1]|0)+","+(rgb[2]|0)+","+(0.2+.75*rr)+")";pctx.fillRect(x,y,cell-1,cell-1);
        if(hij>0){pctx.strokeStyle=col.summary;pctx.globalAlpha=.25+.75*hij;pctx.strokeRect(x+.5,y+.5,cell-2,cell-2);pctx.globalAlpha=1;}
      }
      if(di===0&&dj===0){pctx.strokeStyle=col.accent;pctx.lineWidth=1.4;pctx.strokeRect(x+.5,y+.5,cell-2,cell-2);pctx.lineWidth=1;}
    }
    const cx=gx+rInt*cell+cell*.5,cy=gy+rInt*cell+cell*.5;
    pctx.strokeStyle=col.summary;pctx.globalAlpha=.55;pctx.beginPath();pctx.arc(cx,cy,STRUCT_RMIN*cell,0,Math.PI*2);pctx.stroke();pctx.globalAlpha=1;
    const barX=gx+gridN*cell+28,barW=plate.width-barX-24;
    const rhoVal=s.rho?s.rho[e]:STRUCT_VOLFRAC,E=STRUCT_EMIN+Math.pow(rhoVal,STRUCT_PENAL)*(STRUCT_E0-STRUCT_EMIN),work=s.ce?E*s.ce[e]:0;
    let maxWork=work;
    if(s.ce&&s.rho)for(let k=0;k<s.rho.length;k++){const ek=STRUCT_EMIN+Math.pow(s.rho[k],STRUCT_PENAL)*(STRUCT_E0-STRUCT_EMIN);maxWork=Math.max(maxWork,ek*s.ce[k]);}
    const workN=maxWork>0?work/maxWork:0;
    plateBar(col,barX,barW,36,"density ρ",rhoVal,col.accent);
    plateBar(col,barX,barW,78,"relative elem. energy",workN,col.alert);
    plateBar(col,barX,barW,120,"Mean ρ",s.vol/STRUCT_VOLFRAC,col.summary);
    pctx.fillStyle=col.faint;pctx.fillText("elem "+ei+","+ej+"   p = 3",barX,168);pctx.fillText("C = "+(s.C?s.C.toExponential(2):"—"),barX,186);
    usePlate.setAttribute("aria-label","Filter neighborhood for element "+ei+", "+ej+". Density "+rhoVal.toFixed(3)+". Relative element energy "+workN.toFixed(3)+".");
  }

  function drawPlate(){if(studyMode==="obligations")drawObligationPlate();else drawStructuralPlate();}

  function hitTest(mx,my){
    if(compact.matches||(studyMode==="appendix"&&showDeflect))return-1;
    const L=studyMode==="obligations"?obligationLayout():structuralLayout();
    const nely=studyMode==="obligations"?NELY:structuralState.nely;
    const nelx=studyMode==="obligations"?NELX:structuralState.nelx;
    const i=Math.floor((mx-L.x)/L.s),j=Math.floor((L.y+L.dh-my)/L.s);
    if(i<0||j<0||i>=nelx||j>=nely)return-1;
    if(studyMode==="appendix"&&isPassive(structuralState.kind,i,j,nelx,nely,structuralState.cut))return-1;
    return i*nely+j;
  }

  function showLoader(text){
    loaderText.textContent=text||"Forming field";
    loader.classList.remove("is-hidden");loader.setAttribute("aria-hidden","false");
  }
  function hideLoader(){loader.classList.add("is-hidden");loader.setAttribute("aria-hidden","true");}

  function stopActiveWorker(){
    if(worker){worker.terminate();worker=null;}
    if(workerUrl){URL.revokeObjectURL(workerUrl);workerUrl="";}
    workerMode="";
  }

  function createWorker(source,mode,onMessage){
    stopActiveWorker();
    try{
      worker=new Worker(new URL(source,document.baseURI));
    }
    catch(err){stopActiveWorker();forming=false;primaryFailure=mode==="obligations";hideLoader();fallback.hidden=false;updateReadout();return null;}
    workerMode=mode;
    worker.onmessage=onMessage;
    worker.onerror=()=>{stopActiveWorker();forming=false;primaryFailure=mode==="obligations";hideLoader();fallback.hidden=false;updateReadout();};
    return worker;
  }

  function updateReadout(){
    if(studyMode==="obligations"){
      const view=currentObligation();
      const pending=document.getElementById("methodPending");
      if(morphing){for(const id of ["statV","statM","statT","statGray"])document.getElementById(id).textContent="—";if(pending){pending.hidden=false;pending.textContent="Presentation transition · not a solved design.";}return;}
      const selectedName=OBLIGATION_META[obligationMethod].name;
      const selectedStatus=view?.settled
        ? `${selectedName} completed at iteration ${view.iter}.`
        : view?.rho ? `${selectedName}: intermediate iterate ${view.iter}, not a completed design.`
        : `${selectedName} is waiting to start.`;
      const activeStatus=primaryFailure ? "Solve interrupted; unfinished cases are unavailable."
        : primaryComplete ? "All three runs complete."
        : fields[activeClaim]?.settled ? `${OBLIGATION_META[activeClaim].name} complete; preparing the next run.`
        : `Solving ${OBLIGATION_META[activeClaim].name}, iteration ${activeIteration}.`;
      if(pending){pending.hidden=false;pending.textContent=selectedStatus+" "+activeStatus;}
      const presentable=view?.rho&&(!reduced.matches||view.settled);
      document.getElementById("statV").textContent=presentable?view.vol.toFixed(8):"—";
      document.getElementById("statGray").textContent=presentable?view.gray.toFixed(2):"—";
      const wait=primaryFailure?"Unavailable: ":"Waiting for ";
      document.getElementById("statM").textContent=refs.CmStar>0
        ? presentable?fmtRatio(view.Cm/refs.CmStar):wait+selectedName
        : wait+"Carry";
      document.getElementById("statT").textContent=refs.CtStar>0
        ? presentable?fmtRatio(view.Ct/refs.CtStar):wait+selectedName
        : wait+"Conduct";
    }else{
      const ready=structuralState.C0>1e-12&&structuralState.C>0;
      document.getElementById("statC").textContent=ready?(structuralState.C/structuralState.C0).toFixed(2):"—";
      document.getElementById("statV").textContent=structuralState.vol.toFixed(8);
      document.getElementById("statGray").textContent=structuralState.gray.toFixed(2);
      document.getElementById("statIter").textContent=String(structuralState.iter).padStart(2,"0");
      const pending=document.getElementById("methodPending");
      if(pending)pending.hidden=!forming;
    }
  }

  function applyMeta(){
    const appendix=studyMode==="appendix";
    const method=appendix?structuralMethod:obligationMethod;
    const meta=(appendix?STRUCTURAL_META:OBLIGATION_META)[method];
    document.getElementById("methodIndex").textContent=meta.index;
    document.getElementById("methodName").textContent=meta.name;
    document.getElementById("methodClaim").textContent=meta.claim;
    document.getElementById("methodNote").textContent=meta.note;
    document.getElementById("plateTitle").textContent=meta.plateTitle;
    document.getElementById("plateKey").textContent=appendix?"rmin = 1.6 h":"rmin = 1.8 h";
    document.getElementById("plateCaption").textContent=meta.plateCaption;
    document.getElementById("plateSide").textContent=meta.plateSide;
    nav.querySelectorAll("button").forEach(btn=>{
      const on=btn.dataset.method===method;
      btn.classList.toggle("is-active",on);btn.setAttribute("aria-pressed",on?"true":"false");
    });
    if(appendix){
      const energyBtn=document.getElementById("energyBtn"),deflectBtn=document.getElementById("deflectBtn");
      energyBtn.classList.toggle("is-active",showEnergy);energyBtn.setAttribute("aria-pressed",showEnergy?"true":"false");
      deflectBtn.classList.toggle("is-active",showDeflect);deflectBtn.setAttribute("aria-pressed",showDeflect?"true":"false");
      document.getElementById("energyKey").classList.toggle("is-visible",showEnergy);
      document.getElementById("energyKey").setAttribute("aria-hidden",showEnergy?"false":"true");
      document.getElementById("deflectKey").classList.toggle("is-visible",showDeflect);
      document.getElementById("deflectKey").setAttribute("aria-hidden",showDeflect?"false":"true");
      document.getElementById("dragNote").textContent=showDeflect?"Inspection paused":"Click a cell";
      canvas.setAttribute("aria-label",meta.name+" structural appendix density field. This explanatory run uses a 0.40 designable fraction.");
    }else{
      const loadBtn=document.getElementById("loadBtn"),heatBtn=document.getElementById("heatBtn");
      loadBtn.classList.toggle("is-active",showLoad);loadBtn.setAttribute("aria-pressed",showLoad?"true":"false");
      heatBtn.classList.toggle("is-active",showHeat);heatBtn.setAttribute("aria-pressed",showHeat?"true":"false");
      document.getElementById("loadKey").classList.toggle("is-visible",showLoad);
      document.getElementById("loadKey").setAttribute("aria-hidden",showLoad?"false":"true");
      document.getElementById("heatKey").classList.toggle("is-visible",showHeat);
      document.getElementById("heatKey").setAttribute("aria-hidden",showHeat?"false":"true");
      canvas.setAttribute("aria-label",meta.name+" density field on the shared 56 by 28 domain. The mean physical-density target is 0.40 across the mesh.");
    }
    updateReadout();drawPlate();invalidate();
  }

  function buildChrome(){
    const appendix=studyMode==="appendix";
    app.dataset.study=studyMode;
    document.getElementById("study-title").textContent=appendix?"SAME FRACTION":"SAME VOLUME";
    document.getElementById("studySubtitle").textContent=appendix?"Same target fraction. Different structures.":"Same target budget. Different obligations.";
    document.getElementById("studySpec").textContent=appendix?"APPENDIX · TARGET 0.40 · NUMERICAL":"TARGET 0.40 · NUMERICAL CONSTRAINT";
    studyModeBtn.textContent=appendix?"Return / obligations":"Structural appendix";
    studyModeBtn.setAttribute("aria-label",appendix?"Return to SAME VOLUME obligations":"Open SAME FRACTION structural appendix");
    document.title=appendix?"SAME FRACTION — structural appendix":"SAME VOLUME — v0.3.2 exhibit";
    description.setAttribute("content",appendix?"SAME FRACTION structural appendix — one 0.40 designable fraction across three structural cases.":"SAME VOLUME v0.3.2 — one material budget, three obligations. Carry, Conduct, and Share as the primary exhibit.");
    if(appendix){
      nav.setAttribute("aria-label","Structural appendix case");
      nav.innerHTML='<button type="button" data-method="cantilever" class="is-active"><span>01</span>Cantilever</button><button type="button" data-method="mbb"><span>02</span>MBB</button><button type="button" data-method="lbracket"><span>03</span>L-bracket</button>';
      tools.innerHTML='<button type="button" id="energyBtn" aria-pressed="false" title="Show relative element energy, normalized within this field"><span class="tool-dot" aria-hidden="true"></span>Energy</button><button type="button" id="deflectBtn" aria-pressed="false" title="Show displacement, independently exaggerated for display"><span class="tool-dot" aria-hidden="true"></span>Deflect</button><button type="button" id="reformBtn" title="Replay this deterministic explanatory run">Reform</button><span class="drag-note" id="dragNote">Click a cell</span>';
      keys.innerHTML='<div class="field-key" id="energyKey" aria-hidden="true"><span class="key-dot key-dot-alert"></span><p>Relative element energy</p></div><div class="field-key" id="deflectKey" aria-hidden="true"><span class="key-dot key-dot-warm"></span><p>Scaled displacement</p></div>';
      stats.innerHTML='<div><dt aria-label="Compliance divided by this case\'s uniform-density starting compliance">C / C<sub class="stat-sub">0</sub></dt><dd id="statC">—</dd></div><div><dt>Mean ρ</dt><dd id="statV">—</dd></div><div><dt aria-label="Mean intermediate-density grayness; zero is binary">Gray</dt><dd id="statGray">0.96</dd></div><div><dt>Iter</dt><dd id="statIter">00</dd></div>';
      document.getElementById("method-limitations").textContent="Structural appendix: 2D linear elasticity, Q4, density-filtered SIMP. Each case has a target mean physical density of 0.40 over its designable field, penalty 3, and filter radius 1.6 element lengths. Meshes, domains, supports, and loads differ, so C over C0 is normalized only to that case's uniform-density start and is not a cross-case ranking. Relative energy is normalized within the current field; displayed displacement is independently exaggerated. Gray is mean 4 rho times 1 minus rho, not a convergence score. Runs stop after at most 56 iterations and are local explanatory results, not certified optima or manufacturable parts.";
    }else{
      nav.setAttribute("aria-label","Obligation claim");
      nav.innerHTML='<button type="button" data-method="carry" class="is-active"><span>01</span>Carry</button><button type="button" data-method="conduct"><span>02</span>Conduct</button><button type="button" data-method="share"><span>03</span>Share</button>';
      tools.innerHTML='<button type="button" id="loadBtn" aria-pressed="false" title="Show the mechanical compliance contribution, normalized within this field"><span class="tool-dot" aria-hidden="true"></span>Load</button><button type="button" id="heatBtn" aria-pressed="false" title="Show relative thermal dissipation, normalized independently within this field"><span class="tool-dot" aria-hidden="true"></span>Heat</button><span class="drag-note" id="dragNote">Click a cell</span>';
      keys.innerHTML='<div class="field-key" id="loadKey" aria-hidden="true"><span class="key-dot key-dot-alert"></span><p>Mechanical compliance contribution</p></div><div class="field-key" id="heatKey" aria-hidden="true"><span class="key-dot key-dot-summary"></span><p>Relative thermal dissipation</p></div>';
      stats.innerHTML='<div><dt>Mean ρ</dt><dd id="statV">—</dd></div><div><dt>Mech / ref</dt><dd id="statM">—</dd></div><div><dt>Therm / ref</dt><dd id="statT">—</dd></div><div><dt aria-label="Mean intermediate-density grayness; zero is binary">Gray</dt><dd id="statGray">—</dd></div>';
      document.getElementById("method-limitations").textContent="Primary exhibit: one rectangular domain has 56 by 28 Q4 elements and a target mean physical density of 0.40 across the mesh, including four forced-solid patches; individual cells vary in density. The supports, mechanical load, heat source, and heat sink are unchanged across all three obligations. Density-filtered SIMP uses penalty 3 and filter radius 1.8 element lengths. Carry minimizes mechanical compliance. Conduct minimizes thermal compliance. Share gives equal weight to mechanical compliance normalized by the Carry reference and thermal compliance normalized by the Conduct reference. The two displayed overlays are normalized independently within the current field. Gray is mean 4 rho times one minus rho across the full mesh, including forced-solid cells; it is not a convergence score. There is no thermal strain coupling. These are local explanatory results, not certified optima or manufacturable parts. Density-only presentation transitions are not solved states.";
    }
  }

  function setTheme(next){
    theme=next;
    app.className="same-volume theme-"+theme;
    app.dataset.study=studyMode;
    document.getElementById("paperLabel").classList.toggle("is-active",theme==="paper");
    document.getElementById("uvLabel").classList.toggle("is-active",theme==="uv");
    themeBtn.setAttribute("aria-label","Switch to "+(theme==="uv"?"Paper":"UV")+" presentation");
    themeColor.setAttribute("content",theme==="uv"?"#0D0B18":"#E7DFD2");
    drawPlate();invalidate();
  }

  function invalidate(){
    if(frameHandle)return;
    frameHandle=requestAnimationFrame(renderFrame);
  }

  function renderFrame(now){
    frameHandle=0;
    if(studyMode==="obligations"&&morphing){
      mix=Math.min(1,(now-morphT0)/MORPH_DURATION);
      if(mix>=1){morphing=false;mix=1;updateReadout();drawPlate();}
    }
    drawField();
    if(morphing)invalidate();
  }

  function startPrimary(){
    if(primaryComplete){forming=false;hideLoader();applyMeta();return;}
    fields.carry=fields.conduct=fields.share=null;
    refs.CmStar=0;refs.CtStar=0;
    primaryFailure=false;activeClaim="carry";activeIteration=0;
    forming=true;showLoader("Forming obligations");
    if(studyMode==="obligations"){updateReadout();drawPlate();invalidate();}
    const id=++runId;
    const w=createWorker(OBLIGATION_WORKER_SRC,"obligations",ev=>{
      const msg=ev.data;
      if(!msg||msg.requestId!==id)return;
      if(msg.type==="state"){
        const claim=msg.claim||msg.phase;
        fields[claim]=msg;
        activeClaim=claim;activeIteration=msg.iter;
        if(claim==="carry"&&msg.settled)refs.CmStar=msg.Cm;
        if(claim==="conduct"&&msg.settled)refs.CtStar=msg.Ct;
        if(studyMode==="obligations")updateReadout();
        const canPresent=!reduced.matches||msg.settled;
        const referenceChanged=msg.settled&&(claim==="carry"||claim==="conduct");
        if(studyMode==="obligations"&&((claim===obligationMethod&&canPresent)||referenceChanged)){
          const current=fields[obligationMethod];
          if(current&&current.rho&&(!reduced.matches||current.settled))hideLoader();
          updateReadout();drawPlate();invalidate();
        }
      }else if(msg.type==="done"){
        refs.CmStar=msg.CmStar;refs.CtStar=msg.CtStar;
        fields.carry=Object.assign(msg.fields.carry,{settled:true,claim:"carry"});
        fields.conduct=Object.assign(msg.fields.conduct,{settled:true,claim:"conduct"});
        fields.share=Object.assign(msg.fields.share,{settled:true,claim:"share"});
        primaryComplete=true;forming=false;stopActiveWorker();
        if(studyMode==="obligations"){hideLoader();updateReadout();drawPlate();invalidate();}
        const c=fields.carry,d=fields.conduct,s=fields.share;
        document.getElementById("live").textContent="Three obligation fields completed. Carry mechanical reference 1.00 and thermal "+fmtRatio(c.Ct/d.Ct)+". Conduct mechanical "+fmtRatio(d.Cm/c.Cm)+" and thermal reference 1.00. Share mechanical "+fmtRatio(s.Cm/c.Cm)+" and thermal "+fmtRatio(s.Ct/d.Ct)+".";
      }
    });
    if(w)w.postMessage({type:"run",requestId:id});
  }

  function startStructural(kind,force){
    structuralMethod=kind;
    morphing=false;pin=-1;hover=-1;usePlate.classList.remove("is-inspecting");
    if(!force&&restoreStructural(structuralCache[kind])){
      forming=false;hideLoader();applyMeta();return;
    }
    seedStructural(kind);forming=true;showLoader("Forming "+kind);applyMeta();
    const id=++runId;
    const w=createWorker(STRUCTURAL_WORKER_SRC,"appendix",ev=>{
      const msg=ev.data;
      if(!msg||msg.requestId!==id||msg.kind!==structuralMethod)return;
      if(msg.type==="state"){
        Object.assign(structuralState,{
          kind:msg.kind,nelx:msg.nelx,nely:msg.nely,cut:msg.cut,nActive:msg.nActive,
          rho:msg.rho,ce:msg.ce,U:msg.U,iter:msg.iter,C:msg.C,C0:msg.C0,vol:msg.vol,gray:msg.gray
        });
        if(studyMode==="appendix"&&!reduced.matches){
          hideLoader();updateReadout();drawPlate();invalidate();
        }
      }else if(msg.type==="done"){
        forming=false;
        Object.assign(structuralState,{iter:msg.iter,C:msg.C,C0:msg.C0,vol:msg.vol,gray:msg.gray});
        structuralCache[kind]={
          kind:structuralState.kind,nelx:structuralState.nelx,nely:structuralState.nely,cut:structuralState.cut,nActive:structuralState.nActive,
          rho:structuralState.rho,ce:structuralState.ce,U:structuralState.U,iter:structuralState.iter,C:structuralState.C,C0:structuralState.C0,vol:structuralState.vol,gray:structuralState.gray
        };
        stopActiveWorker();
        if(studyMode==="appendix"){hideLoader();updateReadout();drawPlate();invalidate();}
        document.getElementById("live").textContent=STRUCTURAL_META[kind].name+" explanatory run completed at iteration "+msg.iter+". Within-case C over C0 "+(msg.C/msg.C0).toFixed(2)+", designable volume fraction "+msg.vol.toFixed(3)+".";
      }
    });
    if(w)w.postMessage({type:"run",kind,requestId:id});
  }

  function selectMethod(next){
    pin=-1;hover=-1;usePlate.classList.remove("is-inspecting");
    if(studyMode==="appendix"){
      if(next===structuralMethod)return;
      stopActiveWorker();startStructural(next,false);
      return;
    }
    if(next===obligationMethod)return;
    const fromReady=fields[obligationMethod]&&fields[obligationMethod].settled&&fields[obligationMethod].rho;
    const toReady=fields[next]&&fields[next].settled&&fields[next].rho;
    if(fromReady&&toReady&&!reduced.matches){
      morphFrom=obligationMethod;morphTo=next;mix=0;morphing=true;morphT0=performance.now();
    }else morphing=false;
    obligationMethod=next;
    const cur=currentObligation();
    const presentable=cur&&cur.rho&&(!reduced.matches||cur.settled);
    if(!presentable)showLoader("Waiting for "+OBLIGATION_META[next].name+" result");else hideLoader();
    applyMeta();
  }

  function switchStudy(next){
    if(next===studyMode)return;
    stopActiveWorker();morphing=false;pin=-1;hover=-1;usePlate.classList.remove("is-inspecting");
    studyMode=next;fallback.hidden=true;buildChrome();
    if(studyMode==="appendix")startStructural(structuralMethod,false);
    else{
      forming=!primaryComplete;
      applyMeta();
      if(primaryComplete)hideLoader();else startPrimary();
    }
    document.getElementById("live").textContent=studyMode==="appendix"?"Structural appendix opened. Same designable fraction, three different structural cases.":"Returned to the primary obligations exhibit.";
  }

  function resize(){
    const r=stage.getBoundingClientRect();
    W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));PR=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.floor(W*PR);canvas.height=Math.floor(H*PR);canvas.style.width=W+"px";canvas.style.height=H+"px";
    invalidate();
  }

  function interactiveTarget(target){
    return Boolean(target.closest&&target.closest(".use-plate,.method-nav,.study-tools,.theme-switch,.study-mode-button,.field-fallback,.series-chip,.study-registration,.study-header,a"));
  }

  function toggleDeflect(){
    showDeflect=!showDeflect;
    if(showDeflect){pin=-1;hover=-1;usePlate.classList.remove("is-inspecting");}
    applyMeta();
  }

  themeBtn.addEventListener("click",()=>setTheme(theme==="uv"?"paper":"uv"));
  studyModeBtn.addEventListener("click",()=>switchStudy(studyMode==="obligations"?"appendix":"obligations"));

  nav.addEventListener("click",ev=>{
    const btn=ev.target.closest("button[data-method]");
    if(btn)selectMethod(btn.dataset.method);
  });

  tools.addEventListener("click",ev=>{
    const btn=ev.target.closest("button");
    if(!btn)return;
    if(btn.id==="loadBtn"){showLoad=!showLoad;if(showLoad)showHeat=false;applyMeta();}
    else if(btn.id==="heatBtn"){showHeat=!showHeat;if(showHeat)showLoad=false;applyMeta();}
    else if(btn.id==="energyBtn"){showEnergy=!showEnergy;applyMeta();}
    else if(btn.id==="deflectBtn")toggleDeflect();
    else if(btn.id==="reformBtn"){stopActiveWorker();structuralCache[structuralMethod]=null;startStructural(structuralMethod,true);}
  });

  stage.addEventListener("pointermove",ev=>{
    if(compact.matches){
      if(hover>=0){hover=-1;drawPlate();invalidate();}
      return;
    }
    if(interactiveTarget(ev.target)){
      if(hover>=0){hover=-1;drawPlate();invalidate();}
      return;
    }
    const r=canvas.getBoundingClientRect();
    const next=hitTest(ev.clientX-r.left,ev.clientY-r.top);
    if(next!==hover){hover=next;drawPlate();invalidate();}
  });

  stage.addEventListener("pointerdown",ev=>{
    if(compact.matches)return;
    if(interactiveTarget(ev.target))return;
    const r=canvas.getBoundingClientRect();
    const h=hitTest(ev.clientX-r.left,ev.clientY-r.top);
    if(h>=0){
      pin=pin===h?-1:h;usePlate.classList.toggle("is-inspecting",pin>=0);
      drawPlate();invalidate();
      const nely=studyMode==="obligations"?NELY:structuralState.nely;
      document.getElementById("live").textContent=pin>=0?"Element "+Math.floor(pin/nely)+", "+(pin%nely)+" selected for inspection.":"Element inspection cleared.";
    }
  });

  stage.addEventListener("pointerleave",()=>{
    if(hover>=0){hover=-1;drawPlate();invalidate();}
  });

  window.addEventListener("keydown",ev=>{
    if(ev.defaultPrevented||ev.ctrlKey||ev.metaKey||ev.altKey)return;
    if(ev.target&&ev.target.closest&&ev.target.closest("input,textarea,select,[contenteditable=true]"))return;
    if(ev.key==="1")selectMethod(studyMode==="obligations"?"carry":"cantilever");
    else if(ev.key==="2")selectMethod(studyMode==="obligations"?"conduct":"mbb");
    else if(ev.key==="3")selectMethod(studyMode==="obligations"?"share":"lbracket");
    else if(ev.key==="t"||ev.key==="T")setTheme(theme==="uv"?"paper":"uv");
    else if(ev.key==="a"||ev.key==="A")switchStudy(studyMode==="obligations"?"appendix":"obligations");
    else if(studyMode==="obligations"&&(ev.key==="l"||ev.key==="L")){showLoad=!showLoad;if(showLoad)showHeat=false;applyMeta();}
    else if(studyMode==="obligations"&&(ev.key==="h"||ev.key==="H")){showHeat=!showHeat;if(showHeat)showLoad=false;applyMeta();}
    else if(studyMode==="appendix"&&(ev.key==="e"||ev.key==="E")){showEnergy=!showEnergy;applyMeta();}
    else if(studyMode==="appendix"&&(ev.key==="d"||ev.key==="D"))toggleDeflect();
    else if(studyMode==="appendix"&&(ev.key==="r"||ev.key==="R")){stopActiveWorker();structuralCache[structuralMethod]=null;startStructural(structuralMethod,true);}
    else if(ev.key==="Escape"){
      pin=-1;hover=-1;usePlate.classList.remove("is-inspecting");drawPlate();invalidate();
    }
  });

  window.addEventListener("resize",resize);
  resize();seedStructural("cantilever");buildChrome();applyMeta();setTheme("uv");startPrimary();invalidate();
}
I();
  