
const NELX = 56, NELY = 28, PAD = 3;
const VOLFRAC = 0.4, PENAL = 3, RMIN = 1.8;
const E0 = 1, EMIN = 0.0001, K0 = 1, KMIN = 0.001, NU = 0.3;
const MOVE = 0.15, XMIN = 0.001, MAX_ITER = 80, CG_TOL = 0.0002, CG_MAX = 1400;
const CHANGE_TOL = 0.015, MIN_SETTLE = 24, OBJ_FLAT = 0.00025;

function nodeIndex(i, j) { return i * (NELY + 1) + j; }

function unitKe(nu) {
  const k = [0.5-nu/6, 0.125+nu/8, -0.25-nu/12, -0.125+3*nu/8, -0.25+nu/12, -0.125-nu/8, nu/6, 0.125-3*nu/8];
  const row = [
    [k[0],k[1],k[2],k[3],k[4],k[5],k[6],k[7]],
    [k[1],k[0],k[7],k[6],k[5],k[4],k[3],k[2]],
    [k[2],k[7],k[0],k[5],k[6],k[3],k[4],k[1]],
    [k[3],k[6],k[5],k[0],k[7],k[2],k[1],k[4]],
    [k[4],k[5],k[6],k[7],k[0],k[1],k[2],k[3]],
    [k[5],k[4],k[3],k[2],k[1],k[0],k[7],k[6]],
    [k[6],k[3],k[4],k[1],k[2],k[7],k[0],k[5]],
    [k[7],k[2],k[1],k[4],k[3],k[6],k[5],k[0]]
  ];
  const scale = 1/(1-nu*nu);
  const KE = new Float64Array(64);
  for (let i=0;i<8;i++) for (let j=0;j<8;j++) KE[i*8+j] = scale*row[i][j];
  return KE;
}
function unitKc() {
  const a=2/3,b=-1/6,c=-1/3;
  return Float64Array.from([a,b,c,b, b,a,b,c, c,b,a,b, b,c,b,a]);
}
function markPad(solid, i0,j0,i1,j1) {
  for (let i=Math.max(0,i0); i<=Math.min(NELX-1,i1); i++)
    for (let j=Math.max(0,j0); j<=Math.min(NELY-1,j1); j++) solid[i*NELY+j]=1;
}

function makeDomain() {
  const n = NELX*NELY, nnode=(NELX+1)*(NELY+1);
  const solid = new Uint8Array(n);
  const mFix = new Uint8Array(nnode*2);
  const Fm = new Float64Array(nnode*2);
  const tFix = new Uint8Array(nnode);
  const Qt = new Float64Array(nnode);
  const p = PAD-1;
  markPad(solid, 0,0,p,p);
  markPad(solid, NELX-PAD, NELY-PAD, NELX-1, NELY-1);
  markPad(solid, NELX-PAD, 0, NELX-1, p);
  markPad(solid, 0, NELY-PAD, p, NELY-1);
  for (let i=0;i<=PAD;i++) for (let j=0;j<=PAD;j++) {
    const nn=nodeIndex(i,j); mFix[nn*2]=1; mFix[nn*2+1]=1;
  }
  for (let i=NELX-PAD;i<=NELX;i++) for (let j=NELY-PAD;j<=NELY;j++) Fm[nodeIndex(i,j)*2+1]=-1;
  for (let i=NELX-PAD;i<=NELX;i++) for (let j=0;j<=PAD;j++) Qt[nodeIndex(i,j)]=1;
  for (let i=0;i<=PAD;i++) for (let j=NELY-PAD;j<=NELY;j++) tFix[nodeIndex(i,j)]=1;
  const mFree=[], tFree=[];
  for (let d=0;d<nnode*2;d++) if (!mFix[d]) mFree.push(d);
  for (let d=0;d<nnode;d++) if (!tFix[d]) tFree.push(d);
  const edofM=new Int32Array(n*8), edofT=new Int32Array(n*4);
  for (let i=0;i<NELX;i++) for (let j=0;j<NELY;j++) {
    const e=i*NELY+j;
    const n1=nodeIndex(i,j), n2=nodeIndex(i+1,j), n3=nodeIndex(i+1,j+1), n4=nodeIndex(i,j+1);
    const d=[n1*2,n1*2+1,n2*2,n2*2+1,n3*2,n3*2+1,n4*2,n4*2+1];
    for (let k=0;k<8;k++) edofM[e*8+k]=d[k];
    edofT[e*4]=n1; edofT[e*4+1]=n2; edofT[e*4+2]=n3; edofT[e*4+3]=n4;
  }
  const rmin2=RMIN*RMIN, rInt=Math.ceil(RMIN);
  const neigh=new Array(n), weights=new Array(n);
  for (let i=0;i<NELX;i++) for (let j=0;j<NELY;j++) {
    const e=i*NELY+j, idx=[], w=[]; let wsum=0;
    const i0=Math.max(0,i-rInt), i1=Math.min(NELX-1,i+rInt);
    const j0=Math.max(0,j-rInt), j1=Math.min(NELY-1,j+rInt);
    for (let ii=i0;ii<=i1;ii++) for (let jj=j0;jj<=j1;jj++) {
      const d2=(ii-i)*(ii-i)+(jj-j)*(jj-j); if (d2>rmin2) continue;
      const wij=RMIN-Math.sqrt(d2); if (wij<=0) continue;
      idx.push(ii*NELY+jj); w.push(wij); wsum+=wij;
    }
    neigh[e]=new Int32Array(idx);
    const ww=new Float64Array(w.length);
    for (let k=0;k<w.length;k++) ww[k]=w[k]/wsum;
    weights[e]=ww;
  }
  let nSolid=0; for (let e=0;e<n;e++) if (solid[e]) nSolid++;
  return {n,nnode,nSolid,solid,mFix,Fm,mFree:new Int32Array(mFree),tFix,Qt,tFree:new Int32Array(tFree),edofM,edofT,neigh,weights};
}

function filterDensity(prob,x,out){
  for (let e=0;e<prob.n;e++){
    const idx=prob.neigh[e], w=prob.weights[e]; let s=0;
    for (let k=0;k<idx.length;k++) s+=w[k]*x[idx[k]];
    out[e]=s;
  }
}
function applyPhysical(prob,x,rho){
  filterDensity(prob,x,rho);
  for (let e=0;e<prob.n;e++) if (prob.solid[e]) rho[e]=1;
}
function applyKM(prob,KE,Eof,U,out){
  out.fill(0);
  const {n,edofM}=prob;
  for (let e=0;e<n;e++){
    const E=Eof[e], b=e*8;
    const u0=U[edofM[b]],u1=U[edofM[b+1]],u2=U[edofM[b+2]],u3=U[edofM[b+3]];
    const u4=U[edofM[b+4]],u5=U[edofM[b+5]],u6=U[edofM[b+6]],u7=U[edofM[b+7]];
    for (let a=0;a<8;a++){
      const r=a*8;
      out[edofM[b+a]] += E*(KE[r]*u0+KE[r+1]*u1+KE[r+2]*u2+KE[r+3]*u3+KE[r+4]*u4+KE[r+5]*u5+KE[r+6]*u6+KE[r+7]*u7);
    }
  }
}
function applyKT(prob,KC,Kof,T,out){
  out.fill(0);
  const {n,edofT}=prob;
  for (let e=0;e<n;e++){
    const kk=Kof[e], b=e*4;
    const t0=T[edofT[b]],t1=T[edofT[b+1]],t2=T[edofT[b+2]],t3=T[edofT[b+3]];
    for (let a=0;a<4;a++){
      const r=a*4;
      out[edofT[b+a]] += kk*(KC[r]*t0+KC[r+1]*t1+KC[r+2]*t2+KC[r+3]*t3);
    }
  }
}
function cgGeneric(free, fixed, ndof, apply, F, U, scratch){
  const {r,z,p,Ap,diag}=scratch;
  apply(U, Ap);
  let rz=0;
  for (let i=0;i<free.length;i++){
    const d=free[i];
    r[d]=F[d]-Ap[d];
    const inv=diag[d]>1e-30?1/diag[d]:0;
    z[d]=inv*r[d]; p[d]=z[d]; rz+=r[d]*z[d];
  }
  const rz0=rz;
  if (rz<1e-32){ for(let i=0;i<ndof;i++) if(fixed[i]) U[i]=0; return 0; }
  let iters=0; const tol2=CG_TOL*CG_TOL;
  for (let it=0; it<CG_MAX; it++){
    apply(p, Ap);
    let pAp=0; for (let i=0;i<free.length;i++) pAp+=p[free[i]]*Ap[free[i]];
    if (Math.abs(pAp)<1e-32) break;
    const alpha=rz/pAp;
    for (let i=0;i<free.length;i++){ const d=free[i]; U[d]+=alpha*p[d]; r[d]-=alpha*Ap[d]; }
    let rzNew=0;
    for (let i=0;i<free.length;i++){
      const d=free[i]; const inv=diag[d]>1e-30?1/diag[d]:0;
      z[d]=inv*r[d]; rzNew+=r[d]*z[d];
    }
    iters=it+1;
    if (rzNew<=tol2*rz0) break;
    const beta=rzNew/rz;
    for (let i=0;i<free.length;i++){ const d=free[i]; p[d]=z[d]+beta*p[d]; }
    rz=rzNew;
  }
  for (let i=0;i<ndof;i++) if (fixed[i]) U[i]=0;
  return iters;
}
function elementCEm(prob,KE,U,ce){
  const {n,edofM}=prob;
  for (let e=0;e<n;e++){
    const b=e*8;
    const u0=U[edofM[b]],u1=U[edofM[b+1]],u2=U[edofM[b+2]],u3=U[edofM[b+3]];
    const u4=U[edofM[b+4]],u5=U[edofM[b+5]],u6=U[edofM[b+6]],u7=U[edofM[b+7]];
    const u=[u0,u1,u2,u3,u4,u5,u6,u7];
    let s=0;
    for (let a=0;a<8;a++){
      const r=a*8;
      s += u[a]*(KE[r]*u0+KE[r+1]*u1+KE[r+2]*u2+KE[r+3]*u3+KE[r+4]*u4+KE[r+5]*u5+KE[r+6]*u6+KE[r+7]*u7);
    }
    ce[e]=s;
  }
}
function elementCEt(prob,KC,T,ce){
  const {n,edofT}=prob;
  for (let e=0;e<n;e++){
    const b=e*4;
    const t0=T[edofT[b]],t1=T[edofT[b+1]],t2=T[edofT[b+2]],t3=T[edofT[b+3]];
    const tt=[t0,t1,t2,t3];
    let s=0;
    for (let a=0;a<4;a++){
      const r=a*4;
      s += tt[a]*(KC[r]*t0+KC[r+1]*t1+KC[r+2]*t2+KC[r+3]*t3);
    }
    ce[e]=s;
  }
}
function ocUpdate(prob,x,dc,dv,rhoScratch,move){
  const {n,solid}=prob;
  if (move==null) move=MOVE;
  let l1=0,l2=1e9;
  const xnew=new Float64Array(n);
  for (let k=0;k<48;k++){
    const lmid=0.5*(l1+l2);
    for (let e=0;e<n;e++){
      if (solid[e]){ xnew[e]=1; continue; }
      const xe=x[e];
      const xh=xe*Math.sqrt(Math.max(0,-dc[e]/(lmid*Math.max(1e-12,dv[e]))));
      xnew[e]=Math.max(XMIN, Math.max(xe-move, Math.min(1, Math.min(xe+move, xh))));
    }
    applyPhysical(prob,xnew,rhoScratch);
    let vol=0; for (let e=0;e<n;e++) vol+=rhoScratch[e];
    if (vol>VOLFRAC*n) l1=lmid; else l2=lmid;
    if (l2-l1<1e-6) break;
  }
  return xnew;
}

const KE=unitKe(NU), KC=unitKc();
const prob=makeDomain();
const n=prob.n, nnode=prob.nnode;

function pack(){
  return {
    Eof:new Float64Array(n), Kof:new Float64Array(n),
    U:new Float64Array(nnode*2), T:new Float64Array(nnode),
    ceM:new Float64Array(n), ceT:new Float64Array(n),
    sM:{r:new Float64Array(nnode*2),z:new Float64Array(nnode*2),p:new Float64Array(nnode*2),Ap:new Float64Array(nnode*2),diag:new Float64Array(nnode*2)},
    sT:{r:new Float64Array(nnode),z:new Float64Array(nnode),p:new Float64Array(nnode),Ap:new Float64Array(nnode),diag:new Float64Array(nnode)}
  };
}
function interpolate(rho,Eof,Kof){
  for (let e=0;e<n;e++){
    const rp=Math.pow(rho[e],PENAL);
    Eof[e]=EMIN+rp*(E0-EMIN);
    Kof[e]=KMIN+rp*(K0-KMIN);
  }
}
function evalBoth(rho, pk){
  interpolate(rho, pk.Eof, pk.Kof);
  pk.U.fill(0); pk.T.fill(0);
  pk.sM.diag.fill(0); pk.sT.diag.fill(0);
  for (let e=0;e<n;e++){
    const b=e*8;
    for (let a=0;a<8;a++) pk.sM.diag[prob.edofM[b+a]] += pk.Eof[e]*KE[a*8+a];
    const bt=e*4;
    for (let a=0;a<4;a++) pk.sT.diag[prob.edofT[bt+a]] += pk.Kof[e]*KC[a*4+a];
  }
  cgGeneric(prob.mFree, prob.mFix, nnode*2, (v,o)=>applyKM(prob,KE,pk.Eof,v,o), prob.Fm, pk.U, pk.sM);
  cgGeneric(prob.tFree, prob.tFix, nnode, (v,o)=>applyKT(prob,KC,pk.Kof,v,o), prob.Qt, pk.T, pk.sT);
  elementCEm(prob,KE,pk.U,pk.ceM);
  elementCEt(prob,KC,pk.T,pk.ceT);
  let Cm=0,Ct=0,vol=0,gray=0;
  for (let e=0;e<n;e++){
    Cm += pk.Eof[e]*pk.ceM[e];
    Ct += pk.Kof[e]*pk.ceT[e];
    vol += rho[e];
    gray += 4*rho[e]*(1-rho[e]);
  }
  return {Cm,Ct,vol:vol/n,gray:gray/n};
}
function filterSens(dc,dcf,dvf){
  dcf.fill(0); dvf.fill(0);
  for (let e=0;e<n;e++){
    if (prob.solid[e]) continue;
    const idx=prob.neigh[e], w=prob.weights[e];
    for (let k=0;k<idx.length;k++){ dcf[idx[k]]+=dc[e]*w[k]; dvf[idx[k]]+=w[k]; }
  }
}

function runClaim(claim, refs, onIter){
  const x=new Float64Array(n);
  for (let e=0;e<n;e++) x[e]=prob.solid[e]?1:VOLFRAC;
  const rho=new Float64Array(n);
  const pk=pack();
  const dc=new Float64Array(n), dcf=new Float64Array(n), dvf=new Float64Array(n), rhoTry=new Float64Array(n);
  let lastChange=1, last=null, stop="maxiter", nBig=n;
  const hist=[];
  for (let iter=0; iter<=MAX_ITER; iter++){
    applyPhysical(prob,x,rho);
    last=evalBoth(rho,pk);
    last.iter=iter; last.change=lastChange;
    hist.push({Cm:last.Cm,Ct:last.Ct,change:lastChange});
    let objFlat=false;
    if (hist.length>=5 && iter>=32){
      const a=hist[hist.length-5], b=hist[hist.length-1];
      objFlat = Math.abs(b.Cm-a.Cm)/Math.max(b.Cm,1e-12)<OBJ_FLAT &&
                Math.abs(b.Ct-a.Ct)/Math.max(b.Ct,1e-12)<OBJ_FLAT;
    }
    if (onIter) onIter(rho, pk, last);
    if (iter===MAX_ITER){ stop="maxiter"; break; }
    if (lastChange<CHANGE_TOL && iter>=MIN_SETTLE){ stop="change"; break; }
    if (objFlat){ stop="objective"; break; }
    if (iter>=40 && nBig<=12){ stop="local-change"; break; }
    if (claim==="carry"){
      for (let e=0;e<n;e++){ const r=Math.max(rho[e],1e-9); dc[e]=-PENAL*Math.pow(r,PENAL-1)*(E0-EMIN)*pk.ceM[e]; }
    } else if (claim==="conduct"){
      for (let e=0;e<n;e++){ const r=Math.max(rho[e],1e-9); dc[e]=-PENAL*Math.pow(r,PENAL-1)*(K0-KMIN)*pk.ceT[e]; }
    } else {
      const invM=0.5/refs.CmStar, invT=0.5/refs.CtStar;
      for (let e=0;e<n;e++){
        const r=Math.max(rho[e],1e-9);
        const dp=PENAL*Math.pow(r,PENAL-1);
        dc[e]=-(invM*dp*(E0-EMIN)*pk.ceM[e] + invT*dp*(K0-KMIN)*pk.ceT[e]);
      }
    }
    filterSens(dc,dcf,dvf);
    for (let e=0;e<n;e++) if (prob.solid[e]){ dcf[e]=0; dvf[e]=1; }
    const xnew=ocUpdate(prob,x,dcf,dvf,rhoTry, iter>=40?0.08:MOVE);
    lastChange=0; nBig=0;
    for (let e=0;e<n;e++){
      const d=Math.abs(xnew[e]-x[e]);
      lastChange=Math.max(lastChange,d);
      if (d>0.02) nBig++;
      x[e]=xnew[e];
    }
  }
  let padMin=1;
  for (let e=0;e<n;e++) if (prob.solid[e] && rho[e]<padMin) padMin=rho[e];
  return {Cm:last.Cm,Ct:last.Ct,vol:last.vol,gray:last.gray,iter:last.iter,change:last.change,
    stop, padMin,
    rho:Float32Array.from(rho), ceM:Float32Array.from(pk.ceM), ceT:Float32Array.from(pk.ceT),
    U:Float32Array.from(pk.U), T:Float32Array.from(pk.T)};
}

function snapshot(claim, field, extra){
  return Object.assign({
    type:"state", claim, nelx:NELX, nely:NELY, nSolid:prob.nSolid,
    rho:field.rho, ceM:field.ceM, ceT:field.ceT, U:field.U, T:field.T,
    Cm:field.Cm, Ct:field.Ct, vol:field.vol, gray:field.gray, iter:field.iter,
    change:field.change, stop:field.stop, padMin:field.padMin
  }, extra||{});
}

onmessage = function(ev){
  const msg=ev.data;
  if (!msg || msg.type!=="run") return;
  const requestId=msg.requestId;
  const carry=runClaim("carry", null, (rho,pk,last)=>{
    if (last.iter%2===0) postMessage(snapshot("carry", {
      rho:Float32Array.from(rho), ceM:Float32Array.from(pk.ceM), ceT:Float32Array.from(pk.ceT),
      U:Float32Array.from(pk.U), T:Float32Array.from(pk.T),
      Cm:last.Cm,Ct:last.Ct,vol:last.vol,gray:last.gray,iter:last.iter
    }, {requestId, phase:"carry"}));
  });
  postMessage(Object.assign(snapshot("carry", carry, {requestId, phase:"carry"}), {settled:true}));
  const conduct=runClaim("conduct", null, (rho,pk,last)=>{
    if (last.iter%2===0) postMessage(snapshot("conduct", {
      rho:Float32Array.from(rho), ceM:Float32Array.from(pk.ceM), ceT:Float32Array.from(pk.ceT),
      U:Float32Array.from(pk.U), T:Float32Array.from(pk.T),
      Cm:last.Cm,Ct:last.Ct,vol:last.vol,gray:last.gray,iter:last.iter
    }, {requestId, phase:"conduct"}));
  });
  postMessage(Object.assign(snapshot("conduct", conduct, {requestId, phase:"conduct"}), {settled:true}));
  const share=runClaim("share", {CmStar:carry.Cm, CtStar:conduct.Ct}, (rho,pk,last)=>{
    if (last.iter%2===0) postMessage(snapshot("share", {
      rho:Float32Array.from(rho), ceM:Float32Array.from(pk.ceM), ceT:Float32Array.from(pk.ceT),
      U:Float32Array.from(pk.U), T:Float32Array.from(pk.T),
      Cm:last.Cm,Ct:last.Ct,vol:last.vol,gray:last.gray,iter:last.iter
    }, {requestId, phase:"share"}));
  });
  postMessage({
    type:"done", requestId,
    CmStar:carry.Cm, CtStar:conduct.Ct,
    fields:{carry, conduct, share}
  });
};
