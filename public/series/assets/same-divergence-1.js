(() => {
  const TAU = Math.PI * 2;
  const A = 0.20, B = 0.16, ARROW_SCALE = 0.26, TRAIL_TIME = 3, TRAIL_DT = 0.01;
  const WITNESS = {x0:0.25, x1:0.75, y0:0.25, y1:0.75};
  const TURN = {x0:0.78, x1:1, y0:0.08, y1:0.42};
  const FLUX = 1 / (Math.PI * Math.PI);
  const METHODS = {
    quiet:{id:"quiet", index:"01", name:"Quiet", claim:"Curl free", note:"Only the potential flow. Curl is identically zero. Every arrow serves a source or a sink.", plate:"Fig. 01 — curl free", caption:"Flux held at 1/π².", slide:0, spin:0},
    slide:{id:"slide", index:"02", name:"Slide", claim:"Added shear", note:"The same sources, plus a periodic horizontal shear. Expansion at each point is unchanged.", plate:"Fig. 02 — shear", caption:"Shear added. Flux unchanged.", slide:A, spin:0},
    spin:{id:"spin", index:"03", name:"Spin", claim:"Added eddies", note:"The same sources, plus a lattice of eddies. Witness flux does not move.", plate:"Fig. 03 — eddies", caption:"Eddies added. Flux unchanged.", slide:0, spin:B}
  };
  const app = document.getElementById("app");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("field");
  const plate = document.getElementById("plate");
  const ctx = canvas.getContext("2d", {alpha:true});
  const pctx = plate.getContext("2d");
  const live = document.getElementById("live");
  const dialog = document.getElementById("dialog");
  app.append(dialog);
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = motionPreference.matches;
  let theme = "uv", methodId = "quiet", slideAmp = 0, spinAmp = 0, targetSlide = 0, targetSpin = 0;
  let blendFrom = null, blendStart = 0;
  const BLEND_MS = 680;
  let pin = {x:0.88, y:0.22};
  let showMarks = true, showLoop = true, paused = reduced, trailClock = reduced ? 1 : 0, lastNow = 0, dragging = false;
  let sourceCache = null, sourceKey = "", dpr = 1;
  let square = {x:0, y:0, side:1, w:1, h:1};
  let trailCache = null;
  const seeds = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) seeds.push({x:(i + 1) / 4, y:(j + 1) / 4});

  const mod = v => ((v % 1) + 1) % 1;
  const rho = (x, y) => Math.cos(TAU * x) * Math.cos(TAU * y);
  function velocity(x, y, sa, wa) {
    const s = 1 / (4 * Math.PI);
    return [
      Math.sin(TAU * x) * Math.cos(TAU * y) * s - sa * Math.cos(TAU * y) - wa * Math.sin(TAU * x) * Math.cos(TAU * y),
      Math.cos(TAU * x) * Math.sin(TAU * y) * s + wa * Math.cos(TAU * x) * Math.sin(TAU * y)
    ];
  }
  const curl = (x, y, sa, wa) => -TAU * sa * Math.sin(TAU * y) - 2 * TAU * wa * Math.sin(TAU * x) * Math.sin(TAU * y);
  const J = (p, q) => (-Math.cos(TAU * q) + Math.cos(TAU * p)) / TAU;
  function turnOf(sa, wa) {
    return (TURN.x1 - TURN.x0) * (-TAU * sa) * J(TURN.y0, TURN.y1) + (-2 * TAU * wa) * J(TURN.x0, TURN.x1) * J(TURN.y0, TURN.y1);
  }
  function integrate(x, y, sa, wa, T) {
    const n = Math.round(T / TRAIL_DT);
    const pts = [{x, y}];
    for (let i = 0; i < n; i++) {
      const f = (px, py) => velocity(mod(px), mod(py), sa, wa);
      const k1 = f(x, y);
      const k2 = f(x + 0.5 * TRAIL_DT * k1[0], y + 0.5 * TRAIL_DT * k1[1]);
      const k3 = f(x + 0.5 * TRAIL_DT * k2[0], y + 0.5 * TRAIL_DT * k2[1]);
      const k4 = f(x + TRAIL_DT * k3[0], y + TRAIL_DT * k3[1]);
      x = mod(x + TRAIL_DT / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]));
      y = mod(y + TRAIL_DT / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]));
      pts.push({x, y});
    }
    return pts;
  }
  const cssVar = name => getComputedStyle(app).getPropertyValue(name).trim();
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function signNum(n, d) {
    const v = Number(n);
    const body = Math.abs(v).toFixed(d);
    return (v < 0 || Object.is(v, -0)) ? "−" + body : "+" + body;
  }
  const coord = n => mod(n).toFixed(3);
  const ease = t => 1 - Math.pow(1 - t, 3);
  const blending = () => Math.abs(slideAmp - targetSlide) > 1e-4 || Math.abs(spinAmp - targetSpin) > 1e-4;
  function colors() {
    return {ink:cssVar("--ink"), muted:cssVar("--ink-muted"), faint:cssVar("--ink-faint"), accent:cssVar("--accent"), summary:cssVar("--summary"), warm:cssVar("--warm"), alert:cssVar("--alert"), spine:cssVar("--spine"), field:cssVar("--field")};
  }
  function selfCheck() {
    let max = 0;
    const h = 1e-5;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 12; j++) {
      const x = (i + 0.5) / 12, y = (j + 0.5) / 12;
      for (const [sa, wa] of [[0,0],[A,0],[0,B],[0.35*A,0.55*B]]) {
        const div = (velocity(x+h,y,sa,wa)[0] - velocity(x-h,y,sa,wa)[0]) / (2*h) + (velocity(x,y+h,sa,wa)[1] - velocity(x,y-h,sa,wa)[1]) / (2*h);
        max = Math.max(max, Math.abs(div - rho(x, y)));
      }
    }
    return {max, turnQuiet: Math.abs(turnOf(0,0)), flux: FLUX};
  }
  let frameId=0;
  function wake(){if(!document.hidden && !frameId) frameId=requestAnimationFrame(frame);}
  document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else{lastNow=0;wake();}});
  // Event handlers mutate synchronously; a single queued frame paints the result.
  for(const event of ["click","input","keydown","pointerdown","pointermove"])
    document.addEventListener(event,wake);
  new ResizeObserver(()=>{sourceCache=null;fitCanvas();wake();}).observe(canvas);
  function layoutSquare() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // Compact mode gives the specimen its own stage. Never apply desktop
    // overlay clearances to that shorter stage (the former tiny-square bug).
    const compact = document.documentElement.classList.contains("mobile-reading");
    const side = compact ? Math.min(w, h) * 0.90 : Math.min(w * 0.44, h - 160);
    square = {x:(w - side) / 2, y:compact ? (h - side) / 2 : (h - 110 - side) / 2, side, w, h};
  }
  function fitCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {canvas.width = w; canvas.height = h; sourceCache = null;}
    layoutSquare();
  }
  const toScreen = (x, y) => [square.x + mod(x) * square.side, square.y + mod(y) * square.side];
  function insideSquare(px, py) {
    return px >= square.x && px <= square.x + square.side && py >= square.y && py <= square.y + square.side;
  }
  function toMath(px, py) {
    return {x:Math.min(0.999, Math.max(0, (px - square.x) / square.side)), y:Math.min(0.999, Math.max(0, (py - square.y) / square.side))};
  }
  function ensureSource(col) {
    const key = theme + ":" + Math.round(square.side) + ":" + col.warm + col.summary;
    if (sourceCache && sourceKey === key) return sourceCache;
    const n = Math.max(96, Math.round(square.side));
    const off = document.createElement("canvas");
    off.width = n; off.height = n;
    const o = off.getContext("2d");
    const img = o.createImageData(n, n);
    const warm = hexToRgb(col.warm), sink = hexToRgb(col.summary);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const r = rho((i + 0.5) / n, (j + 0.5) / n);
      const a = Math.round(Math.pow(Math.abs(r), 0.8) * 170);
      const c = r >= 0 ? warm : sink;
      const k = (j * n + i) * 4;
      img.data[k] = c[0]; img.data[k+1] = c[1]; img.data[k+2] = c[2]; img.data[k+3] = a;
    }
    o.putImageData(img, 0, 0);
    sourceCache = off; sourceKey = key;
    return off;
  }
  function drawArrow(g, x0, y0, x1, y1, ink) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = "round"; g.lineJoin = "round";
    if (len < 1.5) {g.beginPath(); g.arc(x0, y0, 1.15, 0, TAU); g.fill(); return;}
    g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    const ang = Math.atan2(dy, dx), head = Math.min(6.2, len * 0.42);
    g.beginPath();
    g.moveTo(x1, y1); g.lineTo(x1 - head * Math.cos(ang - 0.42), y1 - head * Math.sin(ang - 0.42));
    g.moveTo(x1, y1); g.lineTo(x1 - head * Math.cos(ang + 0.42), y1 - head * Math.sin(ang + 0.42));
    g.stroke();
  }
  function strokeBox(g, box, color, ox, oy, side, dash) {
    g.save();
    g.strokeStyle = color; g.lineWidth = 1.25;
    g.setLineDash(dash || []);
    g.strokeRect(ox + box.x0 * side + 0.5, oy + box.y0 * side + 0.5, (box.x1 - box.x0) * side, (box.y1 - box.y0) * side);
    g.restore();
  }
  function tag(g, text, x, y, color) {
    g.save();
    g.font = "10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    g.fillStyle = color; g.textAlign = "left"; g.textBaseline = "bottom";
    g.fillText(text, x + 4, Math.max(12, y - 3));
    g.restore();
  }
  function trails() {
    const key = slideAmp.toFixed(5) + ":" + spinAmp.toFixed(5) + ":" + pin.x.toFixed(4) + ":" + pin.y.toFixed(4);
    if (trailCache && trailCache.key === key) return trailCache;
    trailCache = {
      key,
      seeds: seeds.map(s => integrate(s.x, s.y, slideAmp, spinAmp, TRAIL_TIME)),
      pin: integrate(pin.x, pin.y, slideAmp, spinAmp, TRAIL_TIME)
    };
    return trailCache;
  }
  function strokeTrail(g, pts, color, width) {
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [sx, sy] = toScreen(pts[i].x, pts[i].y);
      if (i === 0) {g.moveTo(sx, sy); continue;}
      const jump = Math.abs(pts[i].x - pts[i-1].x) > 0.5 || Math.abs(pts[i].y - pts[i-1].y) > 0.5;
      if (jump) g.moveTo(sx, sy); else g.lineTo(sx, sy);
    }
    g.strokeStyle = color; g.lineWidth = width; g.lineJoin = "round"; g.lineCap = "round"; g.stroke();
  }
  function headAt(pts, t) {
    return pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
  }
  function drawField() {
    const col = colors();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, square.w, square.h);
    const src = ensureSource(col);
    ctx.save();
    ctx.beginPath(); ctx.rect(square.x, square.y, square.side, square.side); ctx.clip();
    ctx.drawImage(src, square.x, square.y, square.side, square.side);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = col.spine; ctx.globalAlpha = 0.9; ctx.lineWidth = 1;
    ctx.strokeRect(square.x + 0.5, square.y + 0.5, square.side - 1, square.side - 1);
    ctx.restore();
    strokeBox(ctx, WITNESS, col.accent, square.x, square.y, square.side);
    tag(ctx, "WITNESS", square.x + WITNESS.x0 * square.side, square.y + WITNESS.y0 * square.side, col.accent);
    if (showLoop) {
      strokeBox(ctx, TURN, col.alert, square.x, square.y, square.side, [5, 4]);
      tag(ctx, "TURN", square.x + TURN.x0 * square.side, square.y + TURN.y0 * square.side, col.alert);
    }
    if (showMarks) {
      const tr = trails();
      ctx.save();
      ctx.beginPath(); ctx.rect(square.x, square.y, square.side, square.side); ctx.clip();
      tr.seeds.forEach(pts => {
        strokeTrail(ctx, pts, col.faint, 1);
        const end = pts[pts.length - 1], head = headAt(pts, trailClock);
        const [ex, ey] = toScreen(end.x, end.y), [hx, hy] = toScreen(head.x, head.y);
        ctx.beginPath(); ctx.arc(ex, ey, 2.1, 0, TAU); ctx.strokeStyle = col.muted; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fillStyle = col.muted; ctx.fill();
      });
      strokeTrail(ctx, tr.pin, col.accent, 1.35);
      const end = tr.pin[tr.pin.length - 1], head = headAt(tr.pin, trailClock);
      const [ex, ey] = toScreen(end.x, end.y), [hx, hy] = toScreen(head.x, head.y);
      ctx.beginPath(); ctx.arc(ex, ey, 3.2, 0, TAU); ctx.strokeStyle = col.accent; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx, hy, 3.3, 0, TAU); ctx.fillStyle = col.accent; ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath(); ctx.rect(square.x, square.y, square.side, square.side); ctx.clip();
    const n = 11;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n, y = (j + 0.5) / n;
      const [u, v] = velocity(x, y, slideAmp, spinAmp);
      const [sx, sy] = toScreen(x, y);
      drawArrow(ctx, sx, sy, sx + u * ARROW_SCALE * square.side, sy + v * ARROW_SCALE * square.side, col.ink);
    }
    const [px, py] = toScreen(pin.x, pin.y);
    ctx.strokeStyle = col.ink; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px - 11, py); ctx.lineTo(px - 4, py);
    ctx.moveTo(px + 4, py); ctx.lineTo(px + 11, py);
    ctx.moveTo(px, py - 11); ctx.lineTo(px, py - 4);
    ctx.moveTo(px, py + 4); ctx.lineTo(px, py + 11);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, TAU); ctx.fillStyle = col.accent; ctx.fill();
    ctx.restore();
    drawPlate(col);
  }
  function drawPlate(col) {
    const cssW = Math.max(240, plate.clientWidth || 320);
    const cssH = 148;
    const pd = Math.min(window.devicePixelRatio || 1, 2);
    const bw = Math.round(cssW * pd), bh = Math.round(cssH * pd);
    if (plate.width !== bw || plate.height !== bh) {
      plate.width = bw;
      plate.height = bh;
    }
    pctx.setTransform(pd, 0, 0, pd, 0, 0);
    pctx.clearRect(0, 0, cssW, cssH);
    pctx.fillStyle = col.field;
    pctx.fillRect(0, 0, cssW, cssH);
    const side = cssH - 16;
    const ox = 8, oy = 8;
    const src = ensureSource(col);
    pctx.save();
    pctx.beginPath(); pctx.rect(ox, oy, side, side); pctx.clip();
    pctx.drawImage(src, ox, oy, side, side);
    const n = 8;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n, y = (j + 0.5) / n;
      const [u, v] = velocity(x, y, slideAmp, spinAmp);
      drawArrow(pctx, ox + x * side, oy + y * side, ox + (x + u * ARROW_SCALE) * side, oy + (y + v * ARROW_SCALE) * side, col.ink);
    }
    pctx.restore();
    pctx.strokeStyle = col.spine; pctx.lineWidth = 1;
    pctx.strokeRect(ox + 0.5, oy + 0.5, side - 1, side - 1);
    strokeBox(pctx, WITNESS, col.accent, ox, oy, side);
    if (showLoop) strokeBox(pctx, TURN, col.alert, ox, oy, side, [4, 3]);
    pctx.fillStyle = col.accent;
    pctx.beginPath(); pctx.arc(ox + pin.x * side, oy + pin.y * side, 2.6, 0, TAU); pctx.fill();
    const tx = ox + side + 16;
    if (tx + 72 < cssW) {
      pctx.textAlign = "left"; pctx.textBaseline = "top";
      pctx.fillStyle = col.faint;
      pctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      pctx.fillText("FLUX HELD", tx, 14);
      pctx.fillStyle = col.summary;
      pctx.font = "26px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      pctx.fillText("1/π²", tx, 32);
      pctx.fillStyle = col.faint;
      pctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      pctx.fillText(FLUX.toFixed(4), tx, 64);
      pctx.fillStyle = col.ink;
      pctx.fillText("CURL  " + signNum(curl(pin.x, pin.y, slideAmp, spinAmp), 3), tx, 90);
      pctx.fillText("TURN  " + signNum(turnOf(slideAmp, spinAmp), 3), tx, 108);
    }
  }

  function applyReadout(announce) {
    const m = METHODS[methodId];
    document.getElementById("methodIndex").textContent = m.index;
    document.getElementById("methodName").textContent = m.name;
    document.getElementById("methodClaim").textContent = m.claim;
    document.getElementById("methodNote").textContent = m.note;
    document.getElementById("plateTitle").textContent = m.plate;
    document.getElementById("plateCaption").textContent = m.caption;
    const source = rho(pin.x, pin.y);
    const c = curl(pin.x, pin.y, slideAmp, spinAmp);
    const turn = turnOf(slideAmp, spinAmp);
    const end = trails().pin.at(-1);
    document.getElementById("statSource").textContent = signNum(source, 3);
    document.getElementById("statCurl").textContent = signNum(c, 3);
    document.getElementById("statFlux").textContent = "1/π²";
    document.getElementById("statTurn").textContent = signNum(turn, 3);
    document.getElementById("statTravel").textContent = coord(end.x) + ", " + coord(end.y);
    document.getElementById("dragNote").textContent = "Pin " + coord(pin.x) + ", " + coord(pin.y) + (blending() ? " · blending" : paused ? " · paused" : "");
    if (announce) live.textContent = blending()
      ? m.name + " transition. Divergence and witness flux remain unchanged."
      : m.name + ". Source " + signNum(source, 3) + ". Curl " + signNum(c, 3) + ". Flux one over pi squared. Turn " + signNum(turn, 3) + ".";
  }
  function selectMethod(id, announce) {
    if (!METHODS[id]) return;
    const next = METHODS[id];
    const same = id === methodId && !blending();
    methodId = id;
    document.querySelectorAll(".method-nav button").forEach(btn => {
      const on = btn.dataset.method === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    targetSlide = next.slide; targetSpin = next.spin;
    if (reduced || same) {
      slideAmp = targetSlide; spinAmp = targetSpin; blendFrom = null;
      trailCache = null; trailClock = paused ? 1 : 0;
    } else {
      blendFrom = {slide:slideAmp, spin:spinAmp};
      blendStart = performance.now();
      trailClock = 0;
    }
    applyReadout(announce !== false);
  }
  function setTheme(next) {
    theme = next;
    app.classList.toggle("theme-paper", theme === "paper");
    app.classList.toggle("theme-uv", theme !== "paper");
    document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
    document.getElementById("uvLabel").classList.toggle("is-active", theme !== "paper");
    document.getElementById("themeBtn").setAttribute("aria-label", "Switch to " + (theme === "uv" ? "Paper" : "UV") + " presentation");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "paper" ? "#e7dfd2" : "#0d0b18");
    sourceCache = null;
  }
  function setPinFromClient(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const lx = cx - rect.left, ly = cy - rect.top;
    if (!insideSquare(lx, ly)) return false;
    pin = toMath(lx, ly);
    trailCache = null;
    applyReadout(false);
    return true;
  }
  function openReading() {
    const m = METHODS[methodId];
    const end = trails().pin.at(-1);
    document.getElementById("focusValues").textContent = [
      m.index + "  " + m.name + (blending() ? "  · blending" : ""),
      "pin     " + coord(pin.x) + ", " + coord(pin.y),
      "source  " + signNum(rho(pin.x, pin.y), 4),
      "curl    " + signNum(curl(pin.x, pin.y, slideAmp, spinAmp), 4),
      "flux    1/π² = " + FLUX.toFixed(6),
      "turn    " + signNum(turnOf(slideAmp, spinAmp), 4),
      "t = 3   " + coord(end.x) + ", " + coord(end.y),
      "A       " + A.toFixed(2) + "    B  " + B.toFixed(2)
    ].join("\n");
    const shot = document.getElementById("readingFigure");
    shot.getContext("2d").drawImage(plate, 0, 0, shot.width, shot.height);
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  }
  stage.addEventListener("pointerdown", ev => {
    if (ev.target.closest("button, a, input, select, textarea, .use-plate, .method-nav, .study-tools, .theme-switch")) return;
    const rect = canvas.getBoundingClientRect();
    if (!insideSquare(ev.clientX - rect.left, ev.clientY - rect.top)) return;
    canvas.focus({preventScroll:true});
    dragging = true;
    stage.setPointerCapture(ev.pointerId);
    setPinFromClient(ev.clientX, ev.clientY);
  });
  stage.addEventListener("pointermove", ev => { if (dragging) setPinFromClient(ev.clientX, ev.clientY); });
  const endDrag = () => { if (!dragging) return; dragging = false; applyReadout(true); };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  document.querySelectorAll(".method-nav button").forEach(btn => btn.addEventListener("click", () => selectMethod(btn.dataset.method)));
  document.getElementById("themeBtn").addEventListener("click", () => setTheme(theme === "uv" ? "paper" : "uv"));
  document.getElementById("marksBtn").addEventListener("click", () => {
    showMarks = !showMarks;
    document.getElementById("marksBtn").classList.toggle("is-active", showMarks);
    document.getElementById("marksBtn").setAttribute("aria-pressed", String(showMarks));
  });
  document.getElementById("loopBtn").addEventListener("click", () => {
    showLoop = !showLoop;
    document.getElementById("loopBtn").classList.toggle("is-active", showLoop);
    document.getElementById("loopBtn").setAttribute("aria-pressed", String(showLoop));
  });
  document.getElementById("readBtn").addEventListener("click", openReading);
  function setPaused(value) {
    paused = value;
    const button = document.getElementById("pauseBtn");
    button.textContent = paused ? "Resume" : "Pause";
    button.setAttribute("aria-pressed", String(paused));
    applyReadout(false);
    wake();
  }
  document.getElementById("pauseBtn").addEventListener("click", () => setPaused(!paused));

  window.addEventListener("keydown", ev => {
    if (ev.defaultPrevented || ev.repeat || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target.isContentEditable || ev.target.closest?.("input,textarea,select,button,a,summary,[contenteditable]")) return;
    if (dialog.open) return;
    if (ev.key === "1") selectMethod("quiet");
    else if (ev.key === "2") selectMethod("slide");
    else if (ev.key === "3") selectMethod("spin");
    else if (ev.key === "t" || ev.key === "T") setTheme(theme === "uv" ? "paper" : "uv");
    else if (ev.key === "l" || ev.key === "L") document.getElementById("loopBtn").click();
    else if (ev.key === "m" || ev.key === "M") document.getElementById("marksBtn").click();
    else if (ev.key === " ") { ev.preventDefault(); setPaused(!paused); }
    else if (ev.key.startsWith("Arrow") && ev.target === canvas) {
      ev.preventDefault();
      const step = ev.shiftKey ? 0.05 : 0.01;
      if (ev.key === "ArrowLeft") pin.x = mod(pin.x - step);
      if (ev.key === "ArrowRight") pin.x = mod(pin.x + step);
      if (ev.key === "ArrowUp") pin.y = mod(pin.y - step);
      if (ev.key === "ArrowDown") pin.y = mod(pin.y + step);
      trailCache = null;
      applyReadout(true);
    }
  });
  window.addEventListener("resize", () => { sourceCache = null; fitCanvas(); wake(); });
  function frame(now) {
    frameId = 0;
    if (document.hidden) return;
    const dt = lastNow ? Math.min(48, now - lastNow) : 16;
    lastNow = now;
    if (blendFrom) {
      const t = Math.min(1, (now - blendStart) / BLEND_MS);
      const e = ease(t);
      slideAmp = blendFrom.slide + (targetSlide - blendFrom.slide) * e;
      spinAmp = blendFrom.spin + (targetSpin - blendFrom.spin) * e;
      trailCache = null;
      if (t >= 1) { slideAmp = targetSlide; spinAmp = targetSpin; blendFrom = null; trailCache = null; }
      applyReadout(t >= 1);
    }
    if (showMarks && !paused) trailClock = (trailClock + dt / 4200) % 1;
    drawField();
    if (blendFrom || (showMarks && !paused)) wake();
  }
  const check = selfCheck();

  if (check.max > 2e-4 || check.turnQuiet > 1e-9) {
    document.getElementById("checkFail").hidden = false;
    console.warn("divergence check", check);
  }
  fitCanvas();
  setTheme("uv");
  setPaused(paused);
  applyReadout(false);
  wake();
  motionPreference.addEventListener("change", () => {
    reduced = motionPreference.matches;
    if (reduced) {
      slideAmp = targetSlide; spinAmp = targetSpin; blendFrom = null;
      trailCache = null; trailClock = 1; setPaused(true);
    }
  });

  const heading = document.createElement("div");
  heading.className = "mobile-heading";
  const flow = document.createElement("div");
  flow.className = "mobile-flow";
  const topNodes = [document.querySelector(".study-header"), document.querySelector(".theme-switch")];
  const flowNodes = [".method-nav", ".study-tools", ".method-reading", ".field-keys", ".use-plate"].map(s => document.querySelector(s)).filter(Boolean);
  const homes = new Map();
  for (const n of [...topNodes, ...flowNodes]) {
    const marker = document.createComment("home");
    n.before(marker);
    homes.set(n, marker);
  }
  const mq = matchMedia("(max-width:1099px), (max-height:619px)");
  const layoutMobile = () => {
    document.documentElement.classList.toggle("mobile-reading", mq.matches);
    if (mq.matches) {
      app.insertBefore(heading, stage);
      stage.after(flow);
      topNodes.forEach(n => heading.append(n));
      flowNodes.forEach(n => flow.append(n));
    } else {
      for (const [n, marker] of homes) marker.after(n);
      heading.remove();
      flow.remove();
    }
    sourceCache = null;
    fitCanvas(); wake();
  };
  mq.addEventListener("change", layoutMobile);
  layoutMobile();
})();
