
const VOLFRAC = 0.4;
const PENAL = 3;
const RMIN = 1.6;
const E0 = 1;
const EMIN = 1e-6;
const NU = 0.3;
const MOVE = 0.2;
const XMIN = 1e-3;
const MAX_ITER = 56;
const CG_TOL = 1.6e-4;
const CG_MAX = 900;

function unitKe(nu) {
  const k = [
    0.5 - nu / 6, 0.125 + nu / 8, -0.25 - nu / 12, -0.125 + 3 * nu / 8,
    -0.25 + nu / 12, -0.125 - nu / 8, nu / 6, 0.125 - 3 * nu / 8
  ];
  const row = [
    [k[0], k[1], k[2], k[3], k[4], k[5], k[6], k[7]],
    [k[1], k[0], k[7], k[6], k[5], k[4], k[3], k[2]],
    [k[2], k[7], k[0], k[5], k[6], k[3], k[4], k[1]],
    [k[3], k[6], k[5], k[0], k[7], k[2], k[1], k[4]],
    [k[4], k[5], k[6], k[7], k[0], k[1], k[2], k[3]],
    [k[5], k[4], k[3], k[2], k[1], k[0], k[7], k[6]],
    [k[6], k[3], k[4], k[1], k[2], k[7], k[0], k[5]],
    [k[7], k[2], k[1], k[4], k[3], k[6], k[5], k[0]]
  ];
  const scale = 1 / (1 - nu * nu);
  const KE = new Float64Array(64);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) KE[i * 8 + j] = scale * row[i][j];
  return KE;
}

function nodeIndex(nely, ii, jj) { return ii * (nely + 1) + jj; }

function makeProblem(kind) {
  let nelx, nely, cut = 0;
  if (kind === "cantilever") { nelx = 64; nely = 32; }
  else if (kind === "mbb") { nelx = 72; nely = 24; }
  else { nelx = 40; nely = 40; cut = 16; }
  const n = nelx * nely;
  const ndof = (nelx + 1) * (nely + 1) * 2;
  const passive = new Uint8Array(n);
  if (kind === "lbracket") {
    for (let i = 0; i < nelx; i++)
      for (let j = 0; j < nely; j++)
        if (i >= nelx - cut && j >= nely - cut) passive[i * nely + j] = 1;
  }
  const fixed = new Uint8Array(ndof);
  const F = new Float64Array(ndof);
  if (kind === "cantilever") {
    for (let j = 0; j <= nely; j++) {
      const nn = nodeIndex(nely, 0, j);
      fixed[nn * 2] = 1; fixed[nn * 2 + 1] = 1;
    }
    F[nodeIndex(nely, nelx, 0) * 2 + 1] = -1;
  } else if (kind === "mbb") {
    for (let j = 0; j <= nely; j++) fixed[nodeIndex(nely, 0, j) * 2] = 1;
    fixed[nodeIndex(nely, nelx, 0) * 2 + 1] = 1;
    F[nodeIndex(nely, 0, nely) * 2 + 1] = -1;
  } else {
    for (let i = 0; i <= nelx - cut; i++) {
      const nn = nodeIndex(nely, i, nely);
      fixed[nn * 2] = 1; fixed[nn * 2 + 1] = 1;
    }
    F[nodeIndex(nely, nelx, nely - cut) * 2 + 1] = -1;
  }
  const free = [];
  for (let i = 0; i < ndof; i++) if (!fixed[i]) free.push(i);
  const edofs = new Int32Array(n * 8);
  for (let i = 0; i < nelx; i++) {
    for (let j = 0; j < nely; j++) {
      const e = i * nely + j;
      const n1 = nodeIndex(nely, i, j), n2 = nodeIndex(nely, i + 1, j);
      const n3 = nodeIndex(nely, i + 1, j + 1), n4 = nodeIndex(nely, i, j + 1);
      const d = [n1 * 2, n1 * 2 + 1, n2 * 2, n2 * 2 + 1, n3 * 2, n3 * 2 + 1, n4 * 2, n4 * 2 + 1];
      for (let k = 0; k < 8; k++) edofs[e * 8 + k] = d[k];
    }
  }
  const rmin2 = RMIN * RMIN, rInt = Math.ceil(RMIN);
  const neigh = new Array(n), weights = new Array(n);
  for (let i = 0; i < nelx; i++) {
    for (let j = 0; j < nely; j++) {
      const e = i * nely + j;
      const idx = [], w = [];
      let wsum = 0;
      if (passive[e]) { neigh[e] = new Int32Array(0); weights[e] = new Float64Array(0); continue; }
      const i0 = Math.max(0, i - rInt), i1 = Math.min(nelx - 1, i + rInt);
      const j0 = Math.max(0, j - rInt), j1 = Math.min(nely - 1, j + rInt);
      for (let ii = i0; ii <= i1; ii++) {
        for (let jj = j0; jj <= j1; jj++) {
          const ee = ii * nely + jj;
          if (passive[ee]) continue;
          const d2 = (ii - i) * (ii - i) + (jj - j) * (jj - j);
          if (d2 > rmin2) continue;
          const wij = RMIN - Math.sqrt(d2);
          if (wij <= 0) continue;
          idx.push(ee); w.push(wij); wsum += wij;
        }
      }
      neigh[e] = new Int32Array(idx);
      const ww = new Float64Array(w.length);
      for (let k = 0; k < w.length; k++) ww[k] = w[k] / wsum;
      weights[e] = ww;
    }
  }
  let nActive = 0;
  for (let e = 0; e < n; e++) if (!passive[e]) nActive++;
  return { kind, nelx, nely, n, ndof, nActive, cut, passive, fixed, free: new Int32Array(free), F, edofs, neigh, weights };
}

function filterDensity(prob, x, out) {
  const { n, neigh, weights, passive } = prob;
  for (let e = 0; e < n; e++) {
    if (passive[e]) { out[e] = XMIN; continue; }
    const idx = neigh[e], w = weights[e];
    let s = 0;
    for (let k = 0; k < idx.length; k++) s += w[k] * x[idx[k]];
    out[e] = s;
  }
}

function applyK(prob, KE, Eof, U, out) {
  out.fill(0);
  const { n, edofs } = prob;
  for (let e = 0; e < n; e++) {
    const E = Eof[e], base = e * 8;
    const u0 = U[edofs[base]], u1 = U[edofs[base + 1]], u2 = U[edofs[base + 2]], u3 = U[edofs[base + 3]];
    const u4 = U[edofs[base + 4]], u5 = U[edofs[base + 5]], u6 = U[edofs[base + 6]], u7 = U[edofs[base + 7]];
    for (let a = 0; a < 8; a++) {
      const r = a * 8;
      const s = KE[r]*u0 + KE[r+1]*u1 + KE[r+2]*u2 + KE[r+3]*u3 + KE[r+4]*u4 + KE[r+5]*u5 + KE[r+6]*u6 + KE[r+7]*u7;
      out[edofs[base + a]] += E * s;
    }
  }
}

function cgSolve(prob, KE, Eof, F, U, scratch) {
  const { free, ndof, fixed, n, edofs } = prob;
  const { r, z, p, Ap, diag } = scratch;
  diag.fill(0);
  for (let e = 0; e < n; e++) {
    const E = Eof[e], base = e * 8;
    for (let a = 0; a < 8; a++) diag[edofs[base + a]] += E * KE[a * 8 + a];
  }
  applyK(prob, KE, Eof, U, Ap);
  let rz = 0;
  for (let i = 0; i < free.length; i++) {
    const d = free[i];
    r[d] = F[d] - Ap[d];
    const inv = diag[d] > 1e-30 ? 1 / diag[d] : 0;
    z[d] = inv * r[d];
    p[d] = z[d];
    rz += r[d] * z[d];
  }
  const rz0 = rz;
  if (rz < 1e-32) {
    for (let i = 0; i < ndof; i++) if (fixed[i]) U[i] = 0;
    return 0;
  }
  let iters = 0;
  const tol2 = CG_TOL * CG_TOL;
  for (let it = 0; it < CG_MAX; it++) {
    applyK(prob, KE, Eof, p, Ap);
    let pAp = 0;
    for (let i = 0; i < free.length; i++) pAp += p[free[i]] * Ap[free[i]];
    if (Math.abs(pAp) < 1e-32) break;
    const alpha = rz / pAp;
    for (let i = 0; i < free.length; i++) {
      const d = free[i];
      U[d] += alpha * p[d];
      r[d] -= alpha * Ap[d];
    }
    let rzNew = 0;
    for (let i = 0; i < free.length; i++) {
      const d = free[i];
      const inv = diag[d] > 1e-30 ? 1 / diag[d] : 0;
      z[d] = inv * r[d];
      rzNew += r[d] * z[d];
    }
    iters = it + 1;
    if (rzNew <= tol2 * rz0) break;
    const beta = rzNew / rz;
    for (let i = 0; i < free.length; i++) {
      const d = free[i];
      p[d] = z[d] + beta * p[d];
    }
    rz = rzNew;
  }
  for (let i = 0; i < ndof; i++) if (fixed[i]) U[i] = 0;
  return iters;
}

function elementCE(prob, KE, U, ce) {
  const { n, edofs } = prob;
  for (let e = 0; e < n; e++) {
    const base = e * 8;
    const u0 = U[edofs[base]], u1 = U[edofs[base + 1]], u2 = U[edofs[base + 2]], u3 = U[edofs[base + 3]];
    const u4 = U[edofs[base + 4]], u5 = U[edofs[base + 5]], u6 = U[edofs[base + 6]], u7 = U[edofs[base + 7]];
    const uu = [u0,u1,u2,u3,u4,u5,u6,u7];
    let s = 0;
    for (let a = 0; a < 8; a++) {
      const rr = a * 8;
      const Ka = KE[rr]*u0 + KE[rr+1]*u1 + KE[rr+2]*u2 + KE[rr+3]*u3 + KE[rr+4]*u4 + KE[rr+5]*u5 + KE[rr+6]*u6 + KE[rr+7]*u7;
      s += uu[a] * Ka;
    }
    ce[e] = s;
  }
}

let stopFlag = false;
let runToken = 0;

self.onmessage = (ev) => {
  const msg = ev.data;
  if (msg.type === "stop") { stopFlag = true; return; }
  if (msg.type !== "run") return;
  stopFlag = false;
  const token = ++runToken;
  const kind = msg.kind;
  const requestId = msg.requestId;
  const prob = makeProblem(kind);
  const KE = unitKe(NU);
  const { n, ndof, nActive, passive } = prob;
  const x = new Float64Array(n);
  for (let e = 0; e < n; e++) x[e] = passive[e] ? XMIN : VOLFRAC;
  const rho = new Float64Array(n);
  const Eof = new Float64Array(n);
  const U = new Float64Array(ndof);
  const ce = new Float64Array(n);
  const dc = new Float64Array(n);
  const dcf = new Float64Array(n);
  const dvf = new Float64Array(n);
  const rhoTry = new Float64Array(n);
  const scratch = {
    r: new Float64Array(ndof), z: new Float64Array(ndof), p: new Float64Array(ndof),
    Ap: new Float64Array(ndof), diag: new Float64Array(ndof)
  };
  let C0 = 0, lastChange = 1;

  const postState = (iter, C, vol, gray) => {
    const rhoOut = new Float32Array(rho);
    const ceOut = new Float32Array(ce);
    const Uout = new Float32Array(U);
    self.postMessage({
      type: "state", requestId, token, kind, iter, C, C0, vol, gray, change: lastChange,
      nelx: prob.nelx, nely: prob.nely, cut: prob.cut, nActive,
      rho: rhoOut, ce: ceOut, U: Uout
    }, [rhoOut.buffer, ceOut.buffer, Uout.buffer]);
  };

  for (let iter = 0; iter <= MAX_ITER; iter++) {
    if (stopFlag || token !== runToken) return;
    filterDensity(prob, x, rho);
    for (let e = 0; e < n; e++) Eof[e] = EMIN + Math.pow(rho[e], PENAL) * (E0 - EMIN);
    cgSolve(prob, KE, Eof, prob.F, U, scratch);
    elementCE(prob, KE, U, ce);
    let C = 0, vol = 0, gray = 0;
    for (let e = 0; e < n; e++) {
      C += Eof[e] * ce[e];
      if (passive[e]) continue;
      vol += rho[e];
      gray += 4 * rho[e] * (1 - rho[e]);
    }
    vol /= nActive;
    gray /= nActive;
    if (iter === 0) C0 = C;
    postState(iter, C, vol, gray);
    if (iter === MAX_ITER || (lastChange < 0.01 && iter >= 18)) {
      self.postMessage({ type: "done", requestId, token, kind, iter, C, C0, vol, gray });
      return;
    }
    for (let e = 0; e < n; e++) {
      const rr = Math.max(rho[e], 1e-9);
      dc[e] = -PENAL * Math.pow(rr, PENAL - 1) * (E0 - EMIN) * ce[e];
    }
    dcf.fill(0); dvf.fill(0);
    for (let e = 0; e < n; e++) {
      if (passive[e]) continue;
      const idx = prob.neigh[e], w = prob.weights[e];
      for (let k = 0; k < idx.length; k++) {
        dcf[idx[k]] += dc[e] * w[k];
        dvf[idx[k]] += w[k];
      }
    }
    let l1 = 0, l2 = 1e9;
    const xnew = new Float64Array(n);
    for (let k = 0; k < 40; k++) {
      const lmid = 0.5 * (l1 + l2);
      for (let e = 0; e < n; e++) {
        if (passive[e]) { xnew[e] = XMIN; continue; }
        const xe = x[e];
        const xh = xe * Math.sqrt(Math.max(0, -dcf[e] / (lmid * Math.max(1e-12, dvf[e]))));
        xnew[e] = Math.max(XMIN, Math.max(xe - MOVE, Math.min(1, Math.min(xe + MOVE, xh))));
      }
      filterDensity(prob, xnew, rhoTry);
      let v = 0;
      for (let e = 0; e < n; e++) if (!passive[e]) v += rhoTry[e];
      if (v > VOLFRAC * nActive) l1 = lmid; else l2 = lmid;
      if (l2 - l1 < 1e-6) break;
    }
    lastChange = 0;
    for (let e = 0; e < n; e++) {
      lastChange = Math.max(lastChange, Math.abs(xnew[e] - x[e]));
      x[e] = xnew[e];
    }
  }
};
