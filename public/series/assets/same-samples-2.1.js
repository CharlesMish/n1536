
const N = 9;
const X = Object.freeze([0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]);
const Y = Object.freeze([0.20, 0.72, 0.95, 0.55, 0.10, -0.40, -0.05, 0.50, 0.88]);
const H = 0.125;
const PERIOD = N * H; // 9/8 — endpoints stay independent
const DENSE = 640;
const YLO = -0.70;
const YHI = 1.18;
const NODE_EPS = 1e-14;

const META = {
  global: {
    index: "01", name: "Global", claim: "One polynomial",
    note: "The unique degree-8 polynomial through every sample. Between nodes it is still one object.",
    plateTitle: "Fig. 01 — cardinal ℓ", plateCaption: "Lagrange basis for the selected node.", plateSide: "global basis"
  },
  local: {
    index: "02", name: "Local", claim: "Natural cubics",
    note: "Cubics joined with continuous slope and curvature. The ends spend no bending.",
    plateTitle: "Fig. 02 — spline cardinal", plateCaption: "Influence decays across the intervals.", plateSide: "natural spline"
  },
  periodic: {
    index: "03", name: "Periodic", claim: "Band-limited wrap",
    note: "Order-4 trigonometric polynomial, period 9/8. The window is not a closed circle.",
    plateTitle: "Fig. 03 — periodic kernel", plateCaption: "A periodic cardinal through the same nodes.", plateSide: "order 4 · T = 9/8"
  }
};

function hexToRgb(h) {
  const s = String(h || "#000000").trim();
  if (s.startsWith("rgb")) {
    const p = s.match(/[\d.]+/g) || [0, 0, 0];
    return [Number(p[0]) || 0, Number(p[1]) || 0, Number(p[2]) || 0];
  }
  const raw = s[0] === "#" ? s.slice(1) : s;
  const hex = raw.length >= 6 ? raw.slice(0, 6) : (raw + "000000").slice(0, 6);
  return [parseInt(hex.slice(0, 2), 16) || 0, parseInt(hex.slice(2, 4), 16) || 0, parseInt(hex.slice(4, 6), 16) || 0];
}
function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function ease(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - ((-2 * t + 2) ** 5) / 2;
}
function fmtSci(x) {
  if (!isFinite(x)) return "—";
  const a = Math.abs(x);
  if (a === 0) return "0";
  if (a < 1e-12) return "<1e-12";
  if (a < 1e-4) return a.toExponential(1);
  if (a < 10) return a.toFixed(2);
  return a.toFixed(1);
}
function fmtRes(x) {
  if (!isFinite(x)) return "—";
  if (x < 1e-15) return "<1e-15";
  return x.toExponential(1);
}

function binomRow(n) {
  const w = new Float64Array(n);
  let c = 1;
  for (let j = 0; j < n; j++) {
    w[j] = c * ((j & 1) ? -1 : 1);
    c = c * (n - 1 - j) / (j + 1);
  }
  return w;
}

const BARY_W = binomRow(N);

function barycentric(t, y) {
  let num = 0, den = 0;
  for (let j = 0; j < N; j++) {
    const d = t - X[j];
    if (d === 0 || Math.abs(d) < NODE_EPS) return y[j];
    const u = BARY_W[j] / d;
    num += u * y[j];
    den += u;
  }
  return num / den;
}

function naturalMoments(y) {
  const m = new Float64Array(N);
  const a = new Float64Array(N);
  const b = new Float64Array(N);
  const c = new Float64Array(N);
  const r = new Float64Array(N);
  b[0] = 1;
  b[N - 1] = 1;
  for (let i = 1; i < N - 1; i++) {
    a[i] = 1;
    b[i] = 4;
    c[i] = 1;
    r[i] = 6 * (y[i + 1] - 2 * y[i] + y[i - 1]) / (H * H);
  }
  for (let i = 1; i < N; i++) {
    const w = a[i] / b[i - 1];
    b[i] -= w * c[i - 1];
    r[i] -= w * r[i - 1];
  }
  m[N - 1] = r[N - 1] / b[N - 1];
  for (let i = N - 2; i >= 0; i--) m[i] = (r[i] - c[i] * m[i + 1]) / b[i];
  m[0] = 0;
  m[N - 1] = 0;
  return m;
}

function splineInterval(t) {
  if (t <= X[0]) return 0;
  if (t >= X[N - 1]) return N - 2;
  let k = Math.min(N - 2, Math.max(0, Math.floor((t - X[0]) / H)));
  while (k > 0 && t < X[k]) k--;
  while (k < N - 2 && t > X[k + 1]) k++;
  return k;
}

function splineEval(t, y, mom) {
  if (t <= X[0]) return y[0];
  if (t >= X[N - 1]) return y[N - 1];
  const k = splineInterval(t);
  const hk = H;
  const dx = t - X[k];
  const dx1 = X[k + 1] - t;
  return (mom[k] * dx1 * dx1 * dx1 + mom[k + 1] * dx * dx * dx) / (6 * hk)
    + (y[k] - mom[k] * hk * hk / 6) * dx1 / hk
    + (y[k + 1] - mom[k + 1] * hk * hk / 6) * dx / hk;
}

function dftCoeffs(y) {
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    let sr = 0, si = 0;
    for (let j = 0; j < N; j++) {
      const ang = -2 * Math.PI * k * j / N;
      sr += y[j] * Math.cos(ang);
      si += y[j] * Math.sin(ang);
    }
    re[k] = sr / N;
    im[k] = si / N;
  }
  return { re, im };
}

function trigEval(t, coeff) {
  const { re, im } = coeff;
  let s = re[0];
  const m = (N - 1) >> 1;
  for (let k = 1; k <= m; k++) {
    const ang = 2 * Math.PI * k * t / PERIOD;
    s += 2 * re[k] * Math.cos(ang) - 2 * im[k] * Math.sin(ang);
  }
  return s;
}

function secondDiff(values, dt) {
  const n = values.length;
  const out = new Float64Array(n);
  const i2 = 1 / (dt * dt);
  out[0] = (values[2] - 2 * values[1] + values[0]) * i2;
  out[n - 1] = (values[n - 1] - 2 * values[n - 2] + values[n - 3]) * i2;
  for (let i = 1; i < n - 1; i++) out[i] = (values[i + 1] - 2 * values[i] + values[i - 1]) * i2;
  return out;
}

function evalAt(kind, t, y, cache) {
  if (kind === "global") return barycentric(t, y);
  if (kind === "local") return splineEval(t, y, cache.mom);
  return trigEval(t, cache.coeff);
}

function buildCurve(kind, y) {
  const cache = {
    mom: kind === "local" ? naturalMoments(y) : null,
    coeff: kind === "periodic" ? dftCoeffs(y) : null
  };
  const xs = new Float64Array(DENSE);
  const vs = new Float64Array(DENSE);
  for (let i = 0; i < DENSE; i++) {
    const t = i / (DENSE - 1);
    xs[i] = t;
    vs[i] = evalAt(kind, t, y, cache);
  }
  const dt = 1 / (DENSE - 1);
  const ypp = secondDiff(vs, dt);
  const nodeVal = new Float64Array(N);
  let resid = 0;
  for (let j = 0; j < N; j++) {
    const fj = evalAt(kind, X[j], y, cache);
    nodeVal[j] = fj;
    resid = Math.max(resid, Math.abs(fj - y[j]));
  }
  let bend = 0, vmin = vs[0], vmax = vs[0], tv = 0;
  for (let i = 0; i < DENSE; i++) {
    bend += Math.abs(ypp[i]) * dt;
    if (vs[i] < vmin) vmin = vs[i];
    if (vs[i] > vmax) vmax = vs[i];
    if (i) tv += Math.abs(vs[i] - vs[i - 1]);
  }
  return { xs, vs, ypp, resid, bend, span: vmax - vmin, vmin, vmax, tv, kind, nodeVal };
}

const UNIT = [];
for (let j = 0; j < N; j++) {
  const e = new Float64Array(N);
  e[j] = 1;
  UNIT.push(e);
}

function I() {
  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });
  const plate = document.getElementById("plate");
  const pctx = plate.getContext("2d");
  const fallback = document.getElementById("fallback");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!ctx || !pctx) {
    if (fallback) fallback.hidden = false;
    return;
  }

  let theme = "uv";
  let method = "global";
  let showBasis = true;
  let showBend = false;
  let pin = 4;
  let hover = -1;
  let W = 1, Hgt = 1, PR = 1;
  let mix = 1, morphing = false, morphT0 = 0, morphFrom = "global", morphTo = "global";
  const DUR = 900;

  const curves = {
    global: buildCurve("global", Y),
    local: buildCurve("local", Y),
    periodic: buildCurve("periodic", Y)
  };
  const basis = { global: [], local: [], periodic: [] };
  for (let j = 0; j < N; j++) {
    basis.global[j] = buildCurve("global", UNIT[j]);
    basis.local[j] = buildCurve("local", UNIT[j]);
    basis.periodic[j] = buildCurve("periodic", UNIT[j]);
  }

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

  function fieldRect() {
    if(document.documentElement.classList.contains("mobile-reading"))return {x:22,y:24,w:W-44,h:Hgt-48};
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

  function plotMap() {
    const r = fieldRect();
    const padX = r.w * 0.07;
    const padY = r.h * 0.12;
    return {
      r,
      x0: r.x + padX,
      y0: r.y + padY,
      x1: r.x + r.w - padX,
      y1: r.y + r.h - padY,
      toX(t) { return this.x0 + t * (this.x1 - this.x0); },
      toY(v) { return this.y1 - (v - YLO) / (YHI - YLO) * (this.y1 - this.y0); }
    };
  }

  function currentCurve() {
    return curves[method];
  }

  function strokePoly(values, color, width, alpha) {
    const L = plotMap();
    ctx.beginPath();
    for (let i = 0; i < DENSE; i++) {
      const px = L.toX(i / (DENSE - 1));
      const py = L.toY(values[i]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawField() {
    const col = readColors();
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
    ctx.clearRect(0, 0, W, Hgt);
    const L = plotMap();
    ctx.save();
    ctx.fillStyle = theme === "uv" ? "rgba(18,16,34,0.28)" : "rgba(245,239,228,0.38)";
    ctx.fillRect(L.r.x, L.r.y, L.r.w, L.r.h);
    ctx.strokeStyle = col.rule;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.45;
    ctx.strokeRect(L.r.x + 0.5, L.r.y + 0.5, L.r.w - 1, L.r.h - 1);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.strokeStyle = col.rule;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.moveTo(L.x0, L.toY(0));
    ctx.lineTo(L.x1, L.toY(0));
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.fillStyle = col.faint;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let j = 0; j < N; j++) {
      const px = L.toX(X[j]);
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.moveTo(px, L.y0);
      ctx.lineTo(px, L.y1);
      ctx.strokeStyle = col.rule;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.fillText("0", L.toX(0), L.y1 + 10);
    ctx.fillText("1", L.toX(1), L.y1 + 10);
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("0", L.x0 - 8, L.toY(0) - 6);
    ctx.fillText(YHI.toFixed(2), L.x0 - 8, L.y0 + 8);
    ctx.fillText(YLO.toFixed(2), L.x0 - 8, L.y1);
    ctx.textAlign = "left";
    ctx.fillText("Measured y · fixed axes", L.x0, L.r.y + 13);

    const skipGhost = morphing ? { [morphFrom]: true, [morphTo]: true } : { [method]: true };
    const ghostA = theme === "uv" ? 0.16 : 0.18;
    for (const k of ["global", "local", "periodic"]) {
      if (skipGhost[k]) continue;
      strokePoly(curves[k].vs, col.faint, 1.05, ghostA);
    }

    // Influence is a different quantity, drawn only in the separately scaled inset.
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0, L.y0, L.x1 - L.x0, L.y1 - L.y0);
    ctx.clip();
    const vs = currentCurve().vs;
    const ypp = showBend ? secondDiff(vs, 1 / (DENSE - 1)) : null;
    let maxBend = 1e-6;
    if (ypp) for (let i = 0; i < DENSE; i++) maxBend = Math.max(maxBend, Math.abs(ypp[i]));

    const ink = hexToRgb(col.ink);
    const alert = hexToRgb(col.alert);
    const warm = hexToRgb(col.warm);

    const bendLive = showBend && ypp && !morphing;
    if (bendLive) {
      for (let i = 1; i < DENSE; i++) {
        const t = Math.min(1, Math.abs(ypp[i]) / maxBend);
        const rgb = t > 0.55 ? lerp3(warm, alert, (t - 0.55) / 0.45) : lerp3(ink, warm, t / 0.55);
        ctx.strokeStyle = "rgba(" + (rgb[0] | 0) + "," + (rgb[1] | 0) + "," + (rgb[2] | 0) + ",0.92)";
        ctx.lineWidth = 1.25 + 1.7 * t;
        ctx.beginPath();
        ctx.moveTo(L.toX((i - 1) / (DENSE - 1)), L.toY(vs[i - 1]));
        ctx.lineTo(L.toX(i / (DENSE - 1)), L.toY(vs[i]));
        ctx.stroke();
      }
    } else if (morphing) {
      const t = ease(mix);
      strokePoly(curves[morphFrom].vs, col.ink, 1.75, 1 - t);
      strokePoly(curves[morphTo].vs, col.ink, 1.75, t);
    } else {
      strokePoly(vs, col.ink, 1.75, theme === "uv" ? 0.94 : 0.90);
    }
    ctx.restore();

    const focus = pin >= 0 ? pin : hover;
    if (focus >= 0) {
      const px = L.toX(X[focus]);
      ctx.beginPath();
      ctx.strokeStyle = col.accent;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([3, 4]);
      ctx.moveTo(px, L.y0);
      ctx.lineTo(px, L.y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    for (let j = 0; j < N; j++) {
      const px = L.toX(X[j]);
      const py = L.toY(Y[j]);
      const active = j === pin || j === hover;
      ctx.beginPath();
      ctx.arc(px, py, active ? 6.2 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = theme === "uv" ? "#efe7ff" : "#f5efe4";
      ctx.fill();
      ctx.lineWidth = active ? 2 : 1.25;
      ctx.strokeStyle = j === pin ? col.accent : j === hover ? col.warm : col.ink;
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlate() {
    const col = readColors();
    const w = plate.width, h = plate.height;
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.clearRect(0, 0, w, h);
    pctx.fillStyle = theme === "uv" ? "#171329" : "#F5EFE4";
    pctx.fillRect(0, 0, w, h);
    pctx.strokeStyle = theme === "uv" ? "rgba(77,70,114,0.55)" : "rgba(128,111,100,0.38)";
    pctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    const b = basis[method][pin];
    let bmin = -0.35, bmax = 1.15;
    for (let i = 0; i < DENSE; i++) {
      if (b.vs[i] < bmin) bmin = b.vs[i];
      if (b.vs[i] > bmax) bmax = b.vs[i];
    }
    const pad = (bmax - bmin) * 0.12;
    bmin -= pad; bmax += pad;
    const x0 = 18, x1 = w - 18, y0 = 22, y1 = h - 28;
    const toX = t => x0 + t * (x1 - x0);
    const toY = v => y1 - (v - bmin) / (bmax - bmin) * (y1 - y0);

    pctx.strokeStyle = col.rule;
    pctx.globalAlpha = 0.7;
    pctx.beginPath();
    pctx.moveTo(x0, toY(0));
    pctx.lineTo(x1, toY(0));
    pctx.stroke();
    pctx.globalAlpha = 1;

    pctx.beginPath();
    for (let i = 0; i < DENSE; i++) {
      const px = toX(i / (DENSE - 1));
      const py = toY(b.vs[i]);
      if (i === 0) pctx.moveTo(px, py); else pctx.lineTo(px, py);
    }
    pctx.strokeStyle = col.accent;
    pctx.lineWidth = 1.6;
    pctx.stroke();

    for (let j = 0; j < N; j++) {
      const px = toX(X[j]);
      const py = toY(b.nodeVal[j]);
      pctx.beginPath();
      pctx.arc(px, py, j === pin ? 3.4 : 2.2, 0, Math.PI * 2);
      pctx.fillStyle = j === pin ? col.accent : col.faint;
      pctx.fill();
    }

    pctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    pctx.fillStyle = col.faint;
    pctx.fillText("φⱼ · response to +1", 14, 16);
    pctx.textAlign = "right";
    pctx.fillText(bmin.toFixed(2) + " to " + bmax.toFixed(2), w - 14, 16);
    pctx.textAlign = "left";
    pctx.fillStyle = col.muted;
    pctx.fillText("j = " + pin + "   x = " + X[pin].toFixed(3) + "   y = " + Y[pin].toFixed(2), 14, h - 10);
  }

  function hitTest(mx, my) {
    const L = plotMap();
    let best = -1, bd = 22;
    for (let j = 0; j < N; j++) {
      const dx = L.toX(X[j]) - mx;
      const dy = L.toY(Y[j]) - my;
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = j; }
    }
    return best;
  }

  function applyMeta() {
    const e = META[method];
    document.getElementById("methodIndex").textContent = e.index;
    document.getElementById("methodName").textContent = e.name;
    document.getElementById("methodClaim").textContent = e.claim;
    document.getElementById("methodNote").textContent = e.note;
    document.getElementById("plateTitle").textContent =
      method === "global" ? "Fig. 01 — cardinal ℓ" + pin
      : method === "local" ? "Fig. 02 — spline cardinal " + pin
      : "Fig. 03 — periodic kernel " + pin;
    document.getElementById("plateCaption").textContent = e.plateCaption;
    document.getElementById("plateSide").textContent = e.plateSide;
    document.querySelectorAll(".method-nav button").forEach((btn) => {
      const on = btn.dataset.method === method;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.getElementById("basisBtn").classList.toggle("is-active", showBasis);
    document.getElementById("basisBtn").setAttribute("aria-pressed", showBasis ? "true" : "false");
    document.getElementById("bendBtn").classList.toggle("is-active", showBend);
    document.getElementById("bendBtn").setAttribute("aria-pressed", showBend ? "true" : "false");
    document.getElementById("basisKey").classList.toggle("is-visible", showBasis);
    document.getElementById("bendKey").classList.toggle("is-visible", showBend);
    document.getElementById("basisKey").setAttribute("aria-hidden", showBasis ? "false" : "true");
    document.getElementById("bendKey").setAttribute("aria-hidden", showBend ? "false" : "true");
    document.getElementById("usePlate").classList.toggle("is-inspecting", pin >= 0);
    document.getElementById("usePlate").hidden = !showBasis;
    const view = currentCurve();
    document.getElementById("live").textContent =
      e.name + ". " + e.claim + ". Nine frozen samples. Selected index " + pin +
      ". Maximum nodal residual " + fmtRes(view.resid) + ".";
    updateReadout();
    drawPlate();
  }

  function updateReadout() {
    const view = currentCurve();
    document.getElementById("statResid").textContent = fmtRes(view.resid);
    document.getElementById("statBend").textContent = morphing ? "—" : fmtSci(view.bend);
    document.getElementById("statSpan").textContent = morphing ? "—" : view.span.toFixed(2);
    document.getElementById("measurementScope").textContent = morphing
      ? "Crossfading completed curves · endpoint measurements resume when the transition ends."
      : "Span and Bend describe the fitted curve. Influence has its own scale in the inset.";
    document.getElementById("statPin").textContent = String(pin);
  }

  function setTheme(next) {
    theme = next;
    app.className = "same-samples theme-" + theme;
    document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
    document.getElementById("uvLabel").classList.toggle("is-active", theme === "uv");
    document.getElementById("themeBtn").setAttribute(
      "aria-label",
      "Switch to " + (theme === "uv" ? "Paper" : "UV") + " presentation"
    );
    const meta = document.querySelector("meta[name='theme-color']");
    if (meta) meta.setAttribute("content", theme === "uv" ? "#0D0B18" : "#E7DFD2");
    drawPlate();
    drawField();
  }

  function selectMethod(next, snap) {
    if (next === method && !morphing) return;
    if (!snap && !reduced.matches) {
      morphFrom = method;
      morphTo = next;
      mix = 0;
      morphing = true;
      morphT0 = performance.now();
    } else {
      morphing = false;
      mix = 1;
      morphFrom = next;
      morphTo = next;
    }
    method = next;
    applyMeta();
    drawField();
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(r.width));
    const nextH = Math.max(1, Math.round(r.height));
    const nextPR = Math.min(window.devicePixelRatio || 1, 2);
    const fieldW = Math.floor(nextW * nextPR);
    const fieldH = Math.floor(nextH * nextPR);
    const fieldChanged = fieldW !== canvas.width || fieldH !== canvas.height;
    W = nextW;
    Hgt = nextH;
    PR = nextPR;
    if (fieldChanged) {
      canvas.width = fieldW;
      canvas.height = fieldH;
      canvas.style.width = W + "px";
      canvas.style.height = Hgt + "px";
    }
    const cssW = plate.getBoundingClientRect().width || 280;
    const plateW = Math.max(280, Math.floor(cssW * nextPR));
    const plateH = Math.max(110, Math.floor(plateW * 220 / 560));
    if (plate.width !== plateW || plate.height !== plateH) {
      plate.width = plateW;
      plate.height = plateH;
      drawPlate();
    }
  }

  function loop(now) {
    if (morphing) {
      mix = Math.min(1, (now - morphT0) / DUR);
      if (mix >= 1) { morphing = false; mix = 1; updateReadout(); }
    }
    try { drawField(); }
    catch (err) { console.error(err); }
    requestAnimationFrame(loop);
  }

  document.getElementById("themeBtn").addEventListener("click", () => setTheme(theme === "uv" ? "paper" : "uv"));
  document.querySelectorAll(".method-nav button").forEach((btn) => {
    btn.addEventListener("click", () => selectMethod(btn.dataset.method, false));
  });
  document.getElementById("basisBtn").addEventListener("click", () => {
    showBasis = !showBasis;
    applyMeta();
  });
  document.getElementById("bendBtn").addEventListener("click", () => {
    showBend = !showBend;
    applyMeta();
  });

  function overChrome(el) {
    return !!el.closest?.(".use-plate, .method-nav, .study-tools, .theme-switch, .series-chip, .study-registration, .study-header, a");
  }

  stage.addEventListener("pointermove", (ev) => {
    const r = canvas.getBoundingClientRect();
    hover = hitTest(ev.clientX - r.left, ev.clientY - r.top);
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
  stage.addEventListener("pointerleave", () => { hover = -1; });

  window.addEventListener("keydown", (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "1") selectMethod("global", false);
    else if (ev.key === "2") selectMethod("local", false);
    else if (ev.key === "3") selectMethod("periodic", false);
    else if (ev.key === "t" || ev.key === "T") setTheme(theme === "uv" ? "paper" : "uv");
    else if (ev.key === "b" || ev.key === "B") { showBasis = !showBasis; applyMeta(); }
    else if (ev.key === "c" || ev.key === "C" || ev.key === "h" || ev.key === "H") { showBend = !showBend; applyMeta(); }
    else if (ev.key === "ArrowLeft" || ev.key === "[") { pin = (pin + N - 1) % N; applyMeta(); }
    else if (ev.key === "ArrowRight" || ev.key === "]") { pin = (pin + 1) % N; applyMeta(); }
    else if (ev.key === "Escape") { pin = 4; applyMeta(); }
  });

  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  reduced.addEventListener?.("change", () => {
    if (reduced.matches && morphing) {
      morphing = false;
      mix = 1;
      updateReadout();
    }
  });
  resize();
  applyMeta();
  const boot = (location.hash || "").replace("#", "");
  const parts = boot.split(/[,&+\s]+/).filter(Boolean);
  for (const part of parts) {
    if (part === "local" || part === "periodic" || part === "global") selectMethod(part, true);
    if (part === "paper") setTheme("paper");
    if (part === "basis") showBasis = true;
    if (part === "bend") showBend = true;
  }
  applyMeta();
  drawField();
  requestAnimationFrame(loop);
}

try { I(); } catch (err) {
  console.error(err);
  const fb = document.getElementById("fallback");
  if (fb) fb.hidden = false;
}
  