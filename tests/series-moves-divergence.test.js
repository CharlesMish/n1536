import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Evaluate the shipped numerical kernels directly, before their DOM wiring.
const movesSource = readFileSync(new URL('../public/series/assets/same-moves-1.js', import.meta.url), 'utf8');
const movesContext = vm.createContext({});
vm.runInContext(movesSource.slice(movesSource.indexOf('"use strict";'), movesSource.indexOf('/* ---- dom')) + '\nthis.kernel={endOf,walk,diameter,commGap,PERMS,ANG,RAD};', movesContext);
const moves = movesContext.kernel;
const divSource = readFileSync(new URL('../public/series/assets/same-divergence-1.js', import.meta.url), 'utf8');
const divContext = vm.createContext({});
const declarations = divSource.slice(divSource.indexOf('  const TAU'), divSource.indexOf('  const METHODS'));
const functions = divSource.slice(divSource.indexOf('  const mod ='), divSource.indexOf('  const cssVar'));
vm.runInContext(declarations + functions + '\nthis.kernel={rho,velocity,curl,turnOf,integrate,FLUX,TURN,WITNESS,A,B};', divContext);
const divergence = divContext.kernel;
const near = (actual, expected, tolerance=1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}, tolerance ${tolerance}`);

// Midpoint integration independently checks the analytical outward flux and circulation.
function rectangleIntegral(fn, box, n=2000) {
  const dx=(box.x1-box.x0)/n, dy=(box.y1-box.y0)/n;
  let sum=0;
  for(let i=0;i<n;i++) {
    const x=box.x0+(i+0.5)*dx, y=box.y0+(i+0.5)*dy;
    sum+=fn(x,box.y0,0)*dx + fn(box.x1,y,1)*dy + fn(x,box.y1,2)*dx + fn(box.x0,y,3)*dy;
  }
  return sum;
}

test('Moves enumerates every ordering, with fixed length and shared heading at every tested turn scale', () => {
  assert.equal(moves.PERMS.length,720);
  assert.equal(new Set(moves.PERMS.map(p=>p.join(','))).size,720);
  for(const lam of [0,0.13,0.25,0.5,0.75,1]) for(const permutation of moves.PERMS) {
    const path=moves.walk(permutation,lam), end=moves.endOf(permutation,lam);
    const length=path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-path[i].x,p.y-path[i].y),0);
    near(length,2.1);
    near(end.th,2*Math.PI*lam);
    near(path.at(-1).x,end.x);near(path.at(-1).y,end.y);
    if(lam===0){near(end.x,2.1,5e-16);near(end.y,0);}
  }
});

test('Moves keeps its original endpoint cloud and noncommuting pair regression', () => {
  const endpoints=moves.PERMS.map(p=>moves.endOf(p,1));
  assert.equal(new Set(endpoints.map(e=>`${e.x},${e.y}`)).size,720);
  near(endpoints[0].x,-0.6836075443944369);near(endpoints[0].y,-0.2546848688226438);
  near(moves.diameter(1),2.155994823988694);
  let closest=Infinity;
  for(let i=0;i<720;i++)for(let j=i+1;j<720;j++)closest=Math.min(closest,Math.hypot(endpoints[i].x-endpoints[j].x,endpoints[i].y-endpoints[j].y));
  near(closest,0.008287864987023573);
  near(moves.commGap(0,4,1),0.8072793816269557);
  for(let i=0;i<6;i++)for(let j=0;j<6;j++)near(moves.commGap(i,j,0),0);
});

test('Divergence is unchanged pointwise, including intermediate blends', () => {
  const {velocity,rho,A,B}=divergence,h=1e-5;
  for(const [sa,wa] of [[0,0],[A,0],[0,B],[0.35*A,0.55*B]])for(let i=0;i<12;i++)for(let j=0;j<12;j++) {
    const x=(i+.5)/12,y=(j+.5)/12;
    const measured=(velocity(x+h,y,sa,wa)[0]-velocity(x-h,y,sa,wa)[0]+velocity(x,y+h,sa,wa)[1]-velocity(x,y-h,sa,wa)[1])/(2*h);
    near(measured,rho(x,y),1e-8);
  }
});

test('Divergence flux and circulation agree with independent boundary integration', () => {
  const {velocity,turnOf,FLUX,TURN,WITNESS,A,B}=divergence;
  for(const [sa,wa] of [[0,0],[A,0],[0,B],[0.35*A,0.55*B]]) {
    const flux=rectangleIntegral((x,y,side)=>{const [u,v]=velocity(x,y,sa,wa);return [-v,u,v,-u][side];},WITNESS);
    near(flux,FLUX,2e-8);
    const circulation=box=>rectangleIntegral((x,y,side)=>{const [u,v]=velocity(x,y,sa,wa);return [u,v,-u,-v][side];},box);
    near(circulation(TURN),turnOf(sa,wa),2e-8);
    near(circulation(WITNESS),0,2e-12);
  }
});

test('Divergence trajectories remain periodic and distinct while curl distinguishes the default pin', () => {
  const {integrate,curl,A,B}=divergence;
  const ends=[];
  for(const [sa,wa] of [[0,0],[A,0],[0,B]]) {
    const path=integrate(.88,.22,sa,wa,3);
    assert.equal(path.length,301);
    assert.ok(path.every(p=>p.x>=0&&p.x<1&&p.y>=0&&p.y<1));
    ends.push(path.at(-1));
  }
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(Math.hypot(ends[i].x-ends[j].x,ends[i].y-ends[j].y)>.01);
  near(curl(.88,.22,0,0),0);
  near(curl(.88,.22,A,0),-1.2343785642416654);
  near(curl(.88,.22,0,B),1.3519844380352677);
});
