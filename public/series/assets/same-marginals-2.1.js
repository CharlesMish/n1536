
const N = 256;
const HALF = 128;
const SCR_A = 99, SCR_B = 7;
const X_MU = 1.55, X_SD = 0.42;
const DUR = 720;

const META = {
  align: {
    index: "01", name: "Align", claim: "Comonotone ranks",
    note: "Each x-rank keeps the y of the same rank. The two lists never move. Only the contract does.",
    plateTitle: "Fig. 01 — rank wiring", plateKey: "π(i) = i",
    plateCaption: "Sorted x-rank to the same y-rank.", plateSide: "comonotone"
  },
  oppose: {
    index: "02", name: "Oppose", claim: "Countermonotone ranks",
    note: "Each x-rank takes the opposite y-rank. Same lists, reversed duty.",
    plateTitle: "Fig. 02 — rank wiring", plateKey: "π(i) = 255 − i",
    plateCaption: "Sorted x-rank to the reversed y-rank.", plateSide: "countermonotone"
  },
  scramble: {
    index: "03", name: "Scramble", claim: "Fixed low-rank map",
    note: "y-rank = 99·x-rank + 7 (mod 256). Spearman ρs = −0.00023. A permutation, not independence.",
    plateTitle: "Fig. 03 — rank wiring", plateKey: "π(i) = 99i+7 mod 256",
    plateCaption: "A fixed bijection with near-zero ρs.", plateSide: "deterministic"
  }
};

function invNorm(p) {
  if (p <= 0) return -8;
  if (p >= 1) return 8;
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577509590705e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const plow = 0.02425, phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

function invGamma2(p) {
  if (p <= 0) return 0;
  if (p >= 1 - 1e-15) return 30;
  let x = Math.max(0.02, -Math.log(Math.max(1e-12, 1 - p)) * 1.6);
  for (let k = 0; k < 40; k++) {
    const ex = Math.exp(-Math.min(x, 80));
    const F = 1 - ex * (1 + x);
    const f = x * ex;
    if (Math.abs(f) < 1e-18) break;
    x += (p - F) / f;
    if (x < 1e-8) x = 1e-8;
  }
  return x;
}

function buildMarginals() {
  const xl = [], xr = [];
  for (let i = 0; i < HALF; i++) {
    const z = invNorm((i + 0.5) / HALF);
    xl.push(-X_MU + X_SD * z);
    xr.push(X_MU + X_SD * z);
  }
  const xs = xl.concat(xr).sort((a, b) => a - b);
  const ys = [];
  for (let i = 0; i < N; i++) ys.push(invGamma2((i + 0.5) / N));
  ys.sort((a, b) => a - b);
  return { xs: Float64Array.from(xs), ys: Float64Array.from(ys) };
}

function permOf(claim) {
  const p = new Int16Array(N);
  if (claim === "align") {
    for (let i = 0; i < N; i++) p[i] = i;
  } else if (claim === "oppose") {
    for (let i = 0; i < N; i++) p[i] = N - 1 - i;
  } else {
    for (let i = 0; i < N; i++) p[i] = (SCR_A * i + SCR_B) % N;
  }
  return p;
}

function moments(arr) {
  let m = 0;
  for (let i = 0; i < arr.length; i++) m += arr[i];
  m /= arr.length;
  let v = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    v += d * d;
  }
  v /= arr.length;
  return { mean: m, sd: Math.sqrt(v), min: arr[0], max: arr[arr.length - 1] };
}

function pearson(xs, ys, pi) {
  const n = xs.length;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[pi[i]]; }
  mx /= n; my /= n;
  let num = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[pi[i]] - my;
    num += dx * dy; vx += dx * dx; vy += dy * dy;
  }
  return num / Math.sqrt(vx * vy);
}

function spearman(pi) {
  let s = 0;
  for (let i = 0; i < N; i++) {
    const d = i - pi[i];
    s += d * d;
  }
  return 1 - (6 * s) / (N * (N * N - 1));
}

function checksum(arr) {
  const MOD = 1000000007;
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    s = (s + Math.round(arr[i] * 1e8) * (i + 3)) % MOD;
    if (s < 0) s += MOD;
  }
  return s;
}
function fmtMom(x) {
  const v = Math.abs(x) < 5e-12 ? 0 : x;
  return v.toFixed(3);
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function ease(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - ((-2 * t + 2) ** 5) / 2;
}
function fmtRho(x) {
  if (!isFinite(x)) return "—";
  const digits = Math.abs(x) >= 0.02 ? 3 : 5;
  return (x >= 0 ? "+" : "") + x.toFixed(digits);
}
function padRank(i) {
  return String(i + 1).padStart(3, "0");
}

function tokenColor(rank, col) {
  const t = rank / (N - 1);
  const a = hexToRgb(col.summary), b = hexToRgb(col.accent), c = hexToRgb(col.warm);
  const rgb = t < 0.5 ? lerp3(a, b, t / 0.5) : lerp3(b, c, (t - 0.5) / 0.5);
  return rgb;
}

function I() {
  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });
  const plate = document.getElementById("plate");
  const pctx = plate.getContext("2d");
  const loader = document.getElementById("loader");
  const fallback = document.getElementById("fallback");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!ctx || !pctx) {
    loader.classList.add("is-hidden");
    if (fallback) fallback.hidden = false;
    return;
  }
  let platePR = 1;

  const { xs, ys } = buildMarginals();
  const mx = moments(xs), my = moments(ys);
  const audit = { cx: checksum(xs), cy: checksum(ys) };

  const perms = {
    align: permOf("align"),
    oppose: permOf("oppose"),
    scramble: permOf("scramble")
  };
  const stats = {};
  for (const k of Object.keys(perms)) {
    stats[k] = { rs: spearman(perms[k]), r: pearson(xs, ys, perms[k]) };
  }

  const XBINS = 36, YBINS = 36;
  const xHist = new Float64Array(XBINS);
  const yHist = new Float64Array(YBINS);
  for (let i = 0; i < N; i++) {
    const ix = Math.min(XBINS - 1, Math.floor((xs[i] - mx.min) / (mx.max - mx.min) * XBINS));
    const iy = Math.min(YBINS - 1, Math.floor((ys[i] - my.min) / (my.max - my.min) * YBINS));
    xHist[ix]++; yHist[iy]++;
  }
  let xHistMax = 1, yHistMax = 1;
  for (let i = 0; i < XBINS; i++) if (xHist[i] > xHistMax) xHistMax = xHist[i];
  for (let i = 0; i < YBINS; i++) if (yHist[i] > yHistMax) yHistMax = yHist[i];

  let theme = "uv", method = "align";
  let showRanks = false, showPairs = false;
  let pin = 128, hover = -1;
  let W = 1, H = 1, PR = 1;
  let mix = 1, morphing = false, morphT0 = 0, morphFrom = "align", morphTo = "align";

  const css = () => getComputedStyle(app);
  function readColors() {
    const s = css();
    return {
      field: s.getPropertyValue("--field").trim(),
      ink: s.getPropertyValue("--ink").trim(),
      muted: s.getPropertyValue("--ink-muted").trim(),
      faint: s.getPropertyValue("--ink-faint").trim(),
      rule: s.getPropertyValue("--rule").trim(),
      accent: s.getPropertyValue("--accent").trim(),
      summary: s.getPropertyValue("--summary").trim(),
      warm: s.getPropertyValue("--warm").trim(),
      alert: s.getPropertyValue("--alert").trim(),
      solid: s.getPropertyValue("--solid").trim(),
      voidc: s.getPropertyValue("--void").trim()
    };
  }

  function plotRect() {
    const top = W > 700 ? Math.min(H * 0.30, 262) : 28;
    const bot = W > 700 ? Math.min(H * 0.28, 214) : 22;
    const left = W > 860 ? Math.min(W * 0.26, 348) : Math.min(W * 0.07, 28);
    const right = W > 860 ? Math.min(W * 0.36, 430) : Math.min(W * 0.06, 24);
    const box = { x: left, y: top, w: Math.max(80, W - left - right), h: Math.max(80, H - top - bot) };
    const strip = Math.max(30, Math.min(48, box.h * 0.12));
    const gap = 8;
    return {
      plot: { x: box.x + strip + gap, y: box.y, w: box.w - strip - gap, h: box.h - strip - gap },
      xstrip: { x: box.x + strip + gap, y: box.y + box.h - strip, w: box.w - strip - gap, h: strip },
      ystrip: { x: box.x, y: box.y, w: strip, h: box.h - strip - gap },
      box
    };
  }

  function toXY(x, y, P) {
    const u = (x - mx.min) / (mx.max - mx.min);
    const v = (y - my.min) / (my.max - my.min);
    return [P.plot.x + u * P.plot.w, P.plot.y + (1 - v) * P.plot.h];
  }

  function drawHistograms(col, P) {
    ctx.save();
    ctx.fillStyle = theme === "uv" ? "rgba(18,16,34,0.55)" : "rgba(245,239,228,0.45)";
    ctx.fillRect(P.xstrip.x, P.xstrip.y, P.xstrip.w, P.xstrip.h);
    ctx.fillRect(P.ystrip.x, P.ystrip.y, P.ystrip.w, P.ystrip.h);
    ctx.strokeStyle = col.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(P.xstrip.x + 0.5, P.xstrip.y + 0.5, P.xstrip.w - 1, P.xstrip.h - 1);
    ctx.strokeRect(P.ystrip.x + 0.5, P.ystrip.y + 0.5, P.ystrip.w - 1, P.ystrip.h - 1);

    const xbw = P.xstrip.w / XBINS;
    for (let i = 0; i < XBINS; i++) {
      const h = (xHist[i] / xHistMax) * (P.xstrip.h - 8);
      const t = (i + 0.5) / XBINS;
      const rgb = tokenColor(Math.round(t * (N - 1)), col);
      ctx.fillStyle = `rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},0.88)`;
      ctx.fillRect(P.xstrip.x + i * xbw + 0.5, P.xstrip.y + P.xstrip.h - 4 - h, Math.max(1, xbw - 1), h);
    }
    const ybh = P.ystrip.h / YBINS;
    const yInk = hexToRgb(col.summary);
    for (let i = 0; i < YBINS; i++) {
      const w = (yHist[i] / yHistMax) * (P.ystrip.w - 8);
      ctx.fillStyle = `rgba(${yInk[0]|0},${yInk[1]|0},${yInk[2]|0},${(0.22 + 0.70 * (yHist[i] / yHistMax)).toFixed(3)})`;
      ctx.fillRect(P.ystrip.x + P.ystrip.w - 4 - w, P.ystrip.y + (YBINS - 1 - i) * ybh + 0.4, w, Math.max(1, ybh - 0.8));
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = col.faint;
    ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textAlign = "right";
    ctx.fillText("X̃ frozen", P.xstrip.x + P.xstrip.w - 6, P.xstrip.y + 11);
    ctx.save();
    ctx.translate(P.ystrip.x + 11, P.ystrip.y + 52);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "right";
    ctx.fillText("Ỹ frozen", 0, 0);
    ctx.restore();
    ctx.restore();
  }

  function drawCloud(claim, alpha, col, P) {
    const pi = perms[claim];
    ctx.save();
    ctx.beginPath();
    ctx.rect(P.plot.x, P.plot.y, P.plot.w, P.plot.h);
    ctx.clip();
    const R = Math.max(2.4, Math.min(P.plot.w, P.plot.h) * 0.011);
    for (let i = 0; i < N; i++) {
      const [px, py] = toXY(xs[i], ys[pi[i]], P);
      const rgb = tokenColor(i, col);
      const isSel = i === pin || i === hover;
      const a = alpha * (theme === "uv" ? 0.82 : 0.78);
      ctx.beginPath();
      ctx.arc(px, py, isSel ? R + 1.6 : R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},${a})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGuides(col, P) {
    const pi = perms[method];
    const idx = pin >= 0 ? pin : hover;
    if (idx < 0) return;
    const [px, py] = toXY(xs[idx], ys[pi[idx]], P);
    ctx.save();
    if (showPairs) {
      ctx.strokeStyle = col.accent;
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, P.xstrip.y);
      ctx.moveTo(px, py);
      ctx.lineTo(P.ystrip.x + P.ystrip.w, py);
      ctx.stroke();
      ctx.setLineDash([]);
      const xbw = P.xstrip.w / XBINS;
      const ix = Math.min(XBINS - 1, Math.floor((xs[idx] - mx.min) / (mx.max - mx.min) * XBINS));
      const iy = Math.min(YBINS - 1, Math.floor((ys[pi[idx]] - my.min) / (my.max - my.min) * YBINS));
      const ybh = P.ystrip.h / YBINS;
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = col.accent;
      ctx.strokeRect(P.xstrip.x + ix * xbw, P.xstrip.y + 1, xbw, P.xstrip.h - 2);
      ctx.strokeRect(P.ystrip.x + 1, P.ystrip.y + P.ystrip.h - (iy + 1) * ybh, P.ystrip.w - 2, ybh);
      const step = 16;
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = col.warm;
      for (let k = 0; k < N; k += step) {
        if (k === idx) continue;
        const [qx, qy] = toXY(xs[k], ys[pi[k]], P);
        ctx.beginPath();
        ctx.moveTo(qx, P.plot.y + P.plot.h);
        ctx.lineTo(qx, qy);
        ctx.lineTo(P.plot.x, qy);
        ctx.stroke();
      }
    }
    if (showRanks) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = col.faint;
      ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      const marks = [0, 63, 127, 191, 255];
      for (const r of marks) {
        const [rx] = toXY(xs[r], my.min, P);
        const [, ry] = toXY(mx.min, ys[r], P);
        ctx.fillStyle = col.faint;
        ctx.globalAlpha = 0.7;
        ctx.textAlign = "center";
        ctx.fillText(String(r + 1), rx, P.plot.y + P.plot.h - 6);
        ctx.textAlign = "left";
        ctx.fillText(String(r + 1), P.plot.x + 6, ry - 4);
        ctx.strokeStyle = col.rule;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.moveTo(rx, P.plot.y);
        ctx.lineTo(rx, P.plot.y + P.plot.h);
        ctx.moveTo(P.plot.x, ry);
        ctx.lineTo(P.plot.x + P.plot.w, ry);
        ctx.stroke();
        ctx.globalAlpha = 0.55;
      }
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, 6.5, 0, Math.PI * 2);
    ctx.strokeStyle = pin >= 0 && idx === pin ? col.accent : col.warm;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  function drawField() {
    const col = readColors();
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const P = plotRect();
    ctx.save();
    ctx.fillStyle = theme === "uv" ? "rgba(18,16,34,0.72)" : "rgba(245,239,228,0.58)";
    ctx.fillRect(P.plot.x, P.plot.y, P.plot.w, P.plot.h);
    ctx.strokeStyle = col.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(P.plot.x - 0.5, P.plot.y - 0.5, P.plot.w + 1, P.plot.h + 1);
    ctx.restore();

    drawHistograms(col, P);

    if (morphing && mix < 1) {
      const t = reduced.matches ? 1 : ease(mix);
      drawCloud(morphFrom, 1 - t, col, P);
      drawCloud(morphTo, t, col, P);
    } else {
      drawCloud(method, 1, col, P);
    }
    if (!morphing) drawGuides(col, P);

    ctx.save();
    ctx.fillStyle = col.faint;
    ctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "left";
    if(W>700)ctx.fillText("μx " + fmtMom(mx.mean) + "  σx " + fmtMom(mx.sd) + "  μy " + fmtMom(my.mean) + "  σy " + fmtMom(my.sd), P.plot.x + 8, P.plot.y + 14);
    else {ctx.font="11px Helvetica,Arial,sans-serif";ctx.fillText("Same x values · same y values",P.plot.x+6,P.plot.y+16);}
    ctx.textAlign = "right";
    if(W>700)ctx.fillText("ΣX " + audit.cx + "  ΣY " + audit.cy, P.plot.x + P.plot.w - 8, P.plot.y + 14);
    ctx.restore();
  }

  function drawPlate() {
    const col = readColors();
    const w = 560, h = 220;
    pctx.setTransform(platePR, 0, 0, platePR, 0, 0);
    pctx.clearRect(0, 0, w, h);
    pctx.fillStyle = theme === "uv" ? "#171329" : "#F5EFE4";
    pctx.fillRect(0, 0, w, h);
    pctx.strokeStyle = theme === "uv" ? "rgba(77,70,114,0.55)" : "rgba(128,111,100,0.38)";
    pctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const pi = perms[method];
    const leftX = 46, rightX = w - 46;
    const top = 22, bot = h - 18;
    const yAt = (rank) => top + (rank / (N - 1)) * (bot - top);
    const idx = pin >= 0 ? pin : (hover >= 0 ? hover : 128);

    pctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    pctx.fillStyle = col.faint;
    pctx.fillText("x-rank", leftX - 22, 14);
    pctx.textAlign = "right";
    pctx.fillText("y-rank", rightX + 22, 14);
    pctx.textAlign = "left";

    const window = [];
    for (let d = -18; d <= 18; d++) {
      const k = idx + d;
      if (k >= 0 && k < N) window.push(k);
    }
    const extras = [];
    for (let k = 0; k < N; k += 8) extras.push(k);

    function strokePair(i, alpha, width, color) {
      const y0 = yAt(i), y1 = yAt(pi[i]);
      pctx.beginPath();
      pctx.moveTo(leftX, y0);
      const c1x = leftX + (rightX - leftX) * 0.38;
      const c2x = leftX + (rightX - leftX) * 0.62;
      pctx.bezierCurveTo(c1x, y0, c2x, y1, rightX, y1);
      pctx.strokeStyle = color;
      pctx.globalAlpha = alpha;
      pctx.lineWidth = width;
      pctx.stroke();
      pctx.globalAlpha = 1;
    }

    for (const i of extras) strokePair(i, 0.14, 0.7, col.rule);
    for (const i of window) {
      if (i === idx) continue;
      const rgb = tokenColor(i, col);
      strokePair(i, 0.42, 1, `rgb(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0})`);
    }
    const rgb = tokenColor(idx, col);
    strokePair(idx, 0.95, 2.1, `rgb(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0})`);

    pctx.fillStyle = col.ink;
    pctx.beginPath(); pctx.arc(leftX, yAt(idx), 3.2, 0, Math.PI * 2); pctx.fill();
    pctx.fillStyle = col.summary;
    pctx.beginPath(); pctx.arc(rightX, yAt(pi[idx]), 3.2, 0, Math.PI * 2); pctx.fill();

    pctx.fillStyle = col.muted;
    pctx.font = "8px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    pctx.fillText(padRank(idx), 8, yAt(idx) + 3);
    pctx.textAlign = "right";
    pctx.fillText(padRank(pi[idx]), w - 8, yAt(pi[idx]) + 3);
    pctx.textAlign = "left";
    pctx.fillStyle = col.faint;
    pctx.fillText("token identity is x-rank", 12, h - 6);
  }

  function overChrome(el) {
    return !!el?.closest?.(".use-plate, .method-nav, .study-tools, .theme-switch, .field-fallback, .series-chip, .study-registration, .study-header, a");
  }

  function hitTest(mx0, my0) {
    const P = plotRect();
    const pi = perms[method];
    const reach = Math.max(12, Math.min(P.plot.w, P.plot.h) * 0.028);
    let best = -1, bd = reach;
    for (let i = 0; i < N; i++) {
      const [px, py] = toXY(xs[i], ys[pi[i]], P);
      const d = Math.hypot(px - mx0, py - my0);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function applyMeta() {
    const e = META[method];
    document.getElementById("methodIndex").textContent = e.index;
    document.getElementById("methodName").textContent = e.name;
    document.getElementById("methodClaim").textContent = e.claim;
    document.getElementById("methodNote").textContent = e.note;
    document.getElementById("plateTitle").textContent = e.plateTitle;
    document.getElementById("plateKey").textContent = e.plateKey;
    document.getElementById("plateCaption").textContent = e.plateCaption;
    document.getElementById("plateSide").textContent = e.plateSide;
    document.querySelectorAll(".method-nav button").forEach((btn) => {
      const on = btn.dataset.method === method;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.getElementById("ranksBtn").classList.toggle("is-active", showRanks);
    document.getElementById("ranksBtn").setAttribute("aria-pressed", showRanks ? "true" : "false");
    document.getElementById("pairsBtn").classList.toggle("is-active", showPairs);
    document.getElementById("pairsBtn").setAttribute("aria-pressed", showPairs ? "true" : "false");
    document.getElementById("ranksKey").classList.toggle("is-visible", showRanks);
    document.getElementById("pairsKey").classList.toggle("is-visible", showPairs);
    document.getElementById("ranksKey").setAttribute("aria-hidden", showRanks ? "false" : "true");
    document.getElementById("pairsKey").setAttribute("aria-hidden", showPairs ? "false" : "true");
    document.getElementById("usePlate").classList.toggle("is-inspecting", pin >= 0);
    updateReadout(true);
    drawPlate();
  }

  function currentToken() {
    if (pin >= 0) return pin;
    if (hover >= 0) return hover;
    return 128;
  }

  function updateReadout(announce) {
    const pending = document.getElementById("methodPending");
    if (morphing) {
      pending.hidden = false;
      document.getElementById("statRho").textContent = "—";
      document.getElementById("statR").textContent = "—";
      if (announce) {
        document.getElementById("live").textContent =
          "Presentation crossfade only. Not a coupling. Marginal statistics held.";
      }
      return;
    }
    pending.hidden = true;
    const s = stats[method];
    const pi = perms[method];
    const idx = currentToken();
    document.getElementById("statRho").textContent = fmtRho(s.rs);
    document.getElementById("statR").textContent = fmtRho(s.r);
    document.getElementById("statTok").textContent = "x#" + padRank(idx);
    document.getElementById("statPair").textContent = "→ y#" + padRank(pi[idx]);
    if (announce) {
      const e = META[method];
      document.getElementById("live").textContent =
        e.name + ". " + e.claim + ". Spearman " + fmtRho(s.rs) +
        ". Token x-rank " + (idx + 1) + " paired with y-rank " + (pi[idx] + 1) +
        ". Marginal checksums X " + audit.cx + " Y " + audit.cy + ".";
    }
  }

  function setTheme(next) {
    theme = next;
    app.className = "same-marginals theme-" + theme;
    document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
    document.getElementById("uvLabel").classList.toggle("is-active", theme === "uv");
    const themeColor = document.getElementById("themeColor");
    if (themeColor) themeColor.setAttribute("content", theme === "paper" ? "#E7DFD2" : "#0D0B18");
    document.getElementById("themeBtn").setAttribute(
      "aria-label",
      theme === "uv" ? "Switch to Paper presentation" : "Switch to UV presentation"
    );
    drawPlate();
  }

  function selectMethod(next) {
    if (next === method && !morphing) return;
    if (!reduced.matches) {
      morphFrom = method;
      morphTo = next;
      mix = 0;
      morphing = true;
      morphT0 = performance.now();
    } else {
      morphing = false;
      mix = 1;
    }
    method = next;
    applyMeta();
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    PR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * PR);
    canvas.height = Math.floor(H * PR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    platePR = Math.min(window.devicePixelRatio || 1, 2);
    plate.width = Math.floor(560 * platePR);
    plate.height = Math.floor(220 * platePR);
    drawPlate();
  }

  function loop(now) {
    if (morphing) {
      mix = Math.min(1, (now - morphT0) / DUR);
      if (mix >= 1) {
        morphing = false;
        mix = 1;
        updateReadout(true);
        drawPlate();
      }
    }
    drawField();
    requestAnimationFrame(loop);
  }

  document.getElementById("themeBtn").addEventListener("click", () => setTheme(theme === "uv" ? "paper" : "uv"));
  document.querySelectorAll(".method-nav button").forEach((btn) => {
    btn.addEventListener("click", () => selectMethod(btn.dataset.method));
  });
  document.getElementById("ranksBtn").addEventListener("click", () => {
    showRanks = !showRanks;
    applyMeta();
  });
  document.getElementById("pairsBtn").addEventListener("click", () => {
    showPairs = !showPairs;
    applyMeta();
  });
  stage.addEventListener("pointermove", (ev) => {
    if (overChrome(ev.target)) return;
    const r = canvas.getBoundingClientRect();
    const next = hitTest(ev.clientX - r.left, ev.clientY - r.top);
    if (next === hover) return;
    hover = next;
    updateReadout(false);
    drawPlate();
  });
  stage.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || overChrome(ev.target)) return;
    const r = canvas.getBoundingClientRect();
    const h = hitTest(ev.clientX - r.left, ev.clientY - r.top);
    if (h >= 0) {
      pin = h;
      applyMeta();
    }
  });
  stage.addEventListener("pointerleave", () => {
    hover = -1;
    updateReadout(false);
    drawPlate();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "1") selectMethod("align");
    else if (ev.key === "2") selectMethod("oppose");
    else if (ev.key === "3") selectMethod("scramble");
    else if (ev.key === "t" || ev.key === "T") setTheme(theme === "uv" ? "paper" : "uv");
    else if (ev.key === "r" || ev.key === "R") { showRanks = !showRanks; applyMeta(); }
    else if (ev.key === "p" || ev.key === "P") { showPairs = !showPairs; applyMeta(); }
    else if (ev.key === "ArrowLeft" || ev.key === "ArrowDown") {
      pin = (pin < 0 ? 128 : pin) - 1;
      if (pin < 0) pin = N - 1;
      applyMeta();
    } else if (ev.key === "ArrowRight" || ev.key === "ArrowUp") {
      pin = (pin < 0 ? 128 : pin) + 1;
      if (pin >= N) pin = 0;
      applyMeta();
    } else if (ev.key === "Escape") { pin = 128; applyMeta(); }
  });
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(stage);
  }
  reduced.addEventListener?.("change", () => {
    if (reduced.matches && morphing) {
      morphing = false;
      mix = 1;
      updateReadout(true);
      drawPlate();
    }
  });

  const selfCheck = (() => {
    const okAlign = perms.align[0] === 0 && perms.align[N - 1] === N - 1;
    const okOppose = perms.oppose[0] === N - 1 && perms.oppose[N - 1] === 0;
    const okRho = Math.abs(stats.scramble.rs) < 0.03 && Math.abs(stats.align.rs - 1) < 1e-12 && Math.abs(stats.oppose.rs + 1) < 1e-12;
    let okBij = true, okY = true;
    for (const key of ["align", "oppose", "scramble"]) {
      const pi = perms[key];
      const seen = new Uint8Array(N);
      const yCopy = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const j = pi[i];
        if (j < 0 || j >= N || seen[j]) okBij = false;
        else seen[j] = 1;
        yCopy[i] = ys[j];
      }
      yCopy.sort((a, b) => a - b);
      for (let i = 0; i < N; i++) if (yCopy[i] !== ys[i]) okY = false;
    }
    return okAlign && okOppose && okRho && okBij && okY;
  })();

  const boot = (location.hash || "").replace("#", "").toLowerCase();
  if (boot.includes("paper")) setTheme("paper");
  if (boot.includes("oppose")) method = "oppose";
  else if (boot.includes("scramble")) method = "scramble";
  else if (boot.includes("align")) method = "align";
  if (boot.includes("ranks")) showRanks = true;
  if (boot.includes("pairs")) showPairs = true;
  const m = boot.match(/token(\d+)/);
  if (m) pin = Math.max(0, Math.min(N - 1, parseInt(m[1], 10) - 1));

  resize();
  applyMeta();
  loader.classList.add("is-hidden");
  loader.setAttribute("aria-hidden", "true");
  if (!selfCheck) console.warn("SAME MARGINALS self-check failed");
  requestAnimationFrame(loop);

  window.__SAME_MARGINALS__ = {
    N, xs, ys, perms, stats, audit, moments: { x: mx, y: my },
    construction: {
      x: "128 mid-quantiles N(-1.55, 0.42^2) ∪ 128 mid-quantiles N(+1.55, 0.42^2), sorted",
      y: "256 mid-quantiles Gamma(shape=2, rate=1), sorted",
      align: "π(i)=i",
      oppose: "π(i)=255-i",
      scramble: "π(i)=(99*i+7) mod 256"
    }
  };
}
I();
  