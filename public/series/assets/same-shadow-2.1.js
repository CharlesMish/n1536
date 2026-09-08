
const Z0 = -1.0, Z1 = 1.0;
const WALL = 0.18;
const PILLAR = 0.20;
const CAV_H = 0.58;
const AUDIT = 256;
const ORTHO = 1.55;
const GRID = 64;
const EXT = 1.16;
const META = {
  prism: {
    index: "01", name: "Prism", claim: "Constant interval",
    note: "The silhouette is given one depth and kept. Every ray through the mask meets a single slab.",
    plateTitle: "Fig. 01 — prism ray", plateCaption: "One interval, uniform depth.", plateSide: "z ∈ [−1, 1]"
  },
  grade: {
    index: "02", name: "Grade", claim: "Spent thickness",
    note: "The same outline, a depth that changes across the mask. The shadow does not record the spend.",
    plateTitle: "Fig. 02 — grade ray", plateCaption: "One interval, varying length.", plateSide: "z ∈ [−1, −1+h]"
  },
  well: {
    index: "03", name: "Well", claim: "Hidden interval",
    note: "Two faces and a withheld middle, held by a rim and a hub. The canonical ray still finds matter.",
    plateTitle: "Fig. 03 — well ray", plateCaption: "Two intervals, one withheld.", plateSide: "caps · cavity"
  }
};

function sdBox2(x, y, bx, by) {
  const dx = Math.abs(x) - bx, dy = Math.abs(y) - by;
  const ax = Math.max(dx, 0), ay = Math.max(dy, 0);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(ax, ay);
}
function sdMask(x, y) {
  const bar = sdBox2(x, y, 0.22, 0.86);
  const arm = sdBox2(x, y, 0.86, 0.22);
  const hub = Math.hypot(x, y) - 0.36;
  return Math.min(bar, arm, hub) - 0.08;
}
function inMask(x, y) { return sdMask(x, y) <= 0; }
function gradeHeight(x, y) {
  const t = (x + 0.96) / 1.92;
  const u = Math.max(0, Math.min(1, t));
  const smooth = u * u * (3 - 2 * u);
  return 0.28 + 1.72 * smooth;
}
function intervals(kind, x, y) {
  if (!inMask(x, y)) return [];
  if (kind === "prism") return [[Z0, Z1]];
  if (kind === "grade") return [[Z0, Z0 + gradeHeight(x, y)]];
  const d = sdMask(x, y);
  const r = Math.hypot(x, y);
  if (d > -WALL || r < PILLAR) return [[Z0, Z1]];
  return [[Z0, -CAV_H], [CAV_H, Z1]];
}

function auditMasks() {
  const kinds = ["prism", "grade", "well"];
  let dPG = 0, dPW = 0, dGW = 0, area = 0;
  for (let j = 0; j < AUDIT; j++) {
    const y = (0.5 - (j + 0.5) / AUDIT) * 2 * ORTHO;
    for (let i = 0; i < AUDIT; i++) {
      const x = ((i + 0.5) / AUDIT - 0.5) * 2 * ORTHO;
      const p = intervals("prism", x, y).length > 0;
      const g = intervals("grade", x, y).length > 0;
      const w = intervals("well", x, y).length > 0;
      if (p) area++;
      if (p !== g) dPG++;
      if (p !== w) dPW++;
      if (g !== w) dGW++;
    }
  }
  return { mismatch: dPG + dPW + dGW, dPG, dPW, dGW, areaPx: area };
}

function integrateVolumes() {
  const N = 220, ext = ORTHO, cell = (2 * ext) / N;
  const vol = { prism: 0, grade: 0, well: 0 };
  for (let j = 0; j < N; j++) {
    const y = -ext + (j + 0.5) * cell;
    for (let i = 0; i < N; i++) {
      const x = -ext + (i + 0.5) * cell;
      for (const k of ["prism", "grade", "well"]) {
        let h = 0;
        for (const [a, b] of intervals(k, x, y)) h += Math.max(0, b - a);
        vol[k] += h * cell * cell;
      }
    }
  }
  return vol;
}

function buildBoxes(kind) {
  const cell = (2 * EXT) / GRID;
  const boxes = [];
  for (let j = 0; j < GRID; j++) {
    const y = -EXT + (j + 0.5) * cell;
    for (let i = 0; i < GRID; i++) {
      const x = -EXT + (i + 0.5) * cell;
      const iv = intervals(kind, x, y);
      const hx = cell * 0.52, hy = cell * 0.52;
      for (const [a, b] of iv) {
        if (b - a < 0.012) continue;
        boxes.push({ x, y, z0: a, z1: b, hx, hy });
      }
    }
  }
  return boxes;
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function lerp3(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgbStr(rgb, a) {
  return "rgba(" + (rgb[0] | 0) + "," + (rgb[1] | 0) + "," + (rgb[2] | 0) + "," + a + ")";
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

  if (!ctx) {
    loader.classList.add("is-hidden");
    fallback.hidden = false;
    return;
  }

  let theme = "uv";
  let method = "prism";
  let showGhost = true;
  let yaw = 0, pitch = 0;
  let vYaw = 0, vPitch = 0;
  let dragging = false, lx = 0, ly = 0, lt = 0, moved = 0;
  let pin = { x: 0.58, y: 0 };
  let W = 1, H = 1, PR = 1;
  let snapFace = false, faceT0 = 0, faceFromY = 0, faceFromP = 0;
  let cachedCol = null;
  let lastViewLabel = "FACE";
  let lastDrawKey = "";

  const audit = auditMasks();
  const volumes = integrateVolumes();
  const boxes = {
    prism: buildBoxes("prism"),
    grade: buildBoxes("grade"),
    well: buildBoxes("well")
  };

  const boot = (location.hash || "").replace("#", "");
  if (boot === "grade" || boot === "well" || boot === "prism") method = boot;
  if (boot === "paper") theme = "paper";
  if (boot.indexOf("off") >= 0) { yaw = 0.72; pitch = -0.38; }
  if (boot.indexOf("side") >= 0) { yaw = 1.18; pitch = -0.12; }
  if (boot.indexOf("grade") >= 0) method = "grade";
  if (boot.indexOf("well") >= 0) method = "well";
  if (boot.indexOf("paper") >= 0) theme = "paper";

  const css = () => getComputedStyle(app);
  function readColors() {
    const s = css();
    return {
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

  function isFace() { return Math.abs(yaw) < 0.018 && Math.abs(pitch) < 0.018; }

  function viewPoint(x, y, z) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const y1 = y * cp - z * sp;
    const z1 = y * sp + z * cp;
    const x2 = x * cy + z1 * sy;
    const z2 = -x * sy + z1 * cy;
    return [x2, y1, z2];
  }
  function viewNormal(nx, ny, nz) {
    // Linear part of viewPoint — rotate a vector, do not treat it as a point at that coordinate.
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const y1 = ny * cp - nz * sp;
    const z1 = ny * sp + nz * cp;
    return [nx * cy + z1 * sy, y1, -nx * sy + z1 * cy];
  }

  function fieldLayout() {
    if(W<=700)return {x:16,y:16,w:W-32,h:H-32,cx:W/2,cy:H/2,s:Math.min(W-32,H-32)*.32};
    const top = Math.min(H * 0.20, 160);
    const bot = Math.min(H * 0.26, 200);
    const left = W > 860 ? Math.min(W * 0.16, 220) : Math.min(W * 0.04, 20);
    const right = W > 860 ? Math.min(W * 0.28, 340) : Math.min(W * 0.04, 20);
    const x = left, y = top, w = Math.max(40, W - left - right), h = Math.max(40, H - top - bot);
    const s = Math.min(w, h) * 0.42;
    return { x, y, w, h, cx: x + w * 0.52, cy: y + h * 0.50, s };
  }

  function colors() {
    if (cachedCol) return cachedCol;
    cachedCol = readColors();
    return cachedCol;
  }

  function drawField() {
    const col = colors();
    ctx.setTransform(PR, 0, 0, PR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const L = fieldLayout();
    const solid = hexToRgb(col.solid);
    const voidc = hexToRgb(col.voidc);
    const accent = hexToRgb(col.accent);
    const warm = hexToRgb(col.warm);
    const summary = hexToRgb(col.summary);
    const ink = hexToRgb(col.ink);

    const light = [ -0.32, 0.50, 0.78 ];
    const ln = Math.hypot(light[0], light[1], light[2]) || 1;
    light[0] /= ln; light[1] /= ln; light[2] /= ln;

    const faces = [];
    const list = boxes[method];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const x0 = b.x - b.hx, x1 = b.x + b.hx;
      const y0 = b.y - b.hy, y1 = b.y + b.hy;
      const z0 = b.z0, z1 = b.z1;
      const specs = [
        { n: [0, 0, 1], q: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
        { n: [0, 0, -1], q: [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0]] },
        { n: [1, 0, 0], q: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
        { n: [-1, 0, 0], q: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]] },
        { n: [0, 1, 0], q: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
        { n: [0, -1, 0], q: [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]] }
      ];
      for (let k = 0; k < 6; k++) {
        const sp = specs[k];
        const n = viewNormal(sp.n[0], sp.n[1], sp.n[2]);
        if (n[2] <= 0.02) continue;
        const p0 = viewPoint(sp.q[0][0], sp.q[0][1], sp.q[0][2]);
        const p1 = viewPoint(sp.q[1][0], sp.q[1][1], sp.q[1][2]);
        const p2 = viewPoint(sp.q[2][0], sp.q[2][1], sp.q[2][2]);
        const p3 = viewPoint(sp.q[3][0], sp.q[3][1], sp.q[3][2]);
        const zc = 0.25 * (p0[2] + p1[2] + p2[2] + p3[2]);
        const lambert = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
        const faceZ = 0.25 * (sp.q[0][2] + sp.q[1][2] + sp.q[2][2] + sp.q[3][2]);
        faces.push({ zc, p0, p1, p2, p3, lambert, faceZ, cap: Math.abs(sp.n[2]) > 0.9, x: b.x, y: b.y });
      }
    }
    faces.sort((a, b) => a.zc - b.zc);

    if (showGhost) {
      ctx.save();
      ctx.beginPath();
      let started = false;
      const steps = 240;
      for (let k = 0; k <= steps; k++) {
        const ang = k / steps * Math.PI * 2;
        let hx = 0, hy = 0, found = false;
        for (let rad = 1.18; rad >= 0.12; rad -= 0.012) {
          const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
          if (inMask(x, y)) { hx = x; hy = y; found = true; break; }
        }
        if (!found) continue;
        const p = viewPoint(hx, hy, 0);
        const px = L.cx + p[0] * L.s, py = L.cy - p[1] * L.s;
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = rgbStr(warm, theme === "uv" ? 0.07 : 0.08);
      ctx.fill();
      ctx.strokeStyle = rgbStr(warm, 0.55);
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }

    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      const ang = Math.abs(yaw) + Math.abs(pitch);
      const facing = Math.max(0, 1 - ang / 0.22);
      let rgb = lerp3(voidc, solid, 0.55 + 0.27 * facing + (1 - facing) * 0.35 * ((f.faceZ + 1) / 2));
      const shade = (0.34 + 0.44 * facing) + (0.66 - 0.44 * facing) * f.lambert;
      rgb = [rgb[0] * shade, rgb[1] * shade, rgb[2] * shade];
      if (method === "grade") {
        const gt = Math.max(0, Math.min(1, (f.x + 0.96) / 1.92));
        rgb = lerp3(rgb, warm, 0.14 * gt * (1 - facing));
      }
      if (method === "well" && !f.cap) {
        rgb = lerp3(rgb, summary, 0.10 * (1 - facing));
      }
      const a = 1;
      ctx.beginPath();
      ctx.moveTo(L.cx + f.p0[0] * L.s, L.cy - f.p0[1] * L.s);
      ctx.lineTo(L.cx + f.p1[0] * L.s, L.cy - f.p1[1] * L.s);
      ctx.lineTo(L.cx + f.p2[0] * L.s, L.cy - f.p2[1] * L.s);
      ctx.lineTo(L.cx + f.p3[0] * L.s, L.cy - f.p3[1] * L.s);
      ctx.closePath();
      ctx.fillStyle = rgbStr(rgb, a);
      ctx.fill();
    }

    if (pin) {
      const p = viewPoint(pin.x, pin.y, 0);
      const px = L.cx + p[0] * L.s, py = L.cy - p[1] * L.s;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.strokeStyle = col.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const pA = viewPoint(pin.x, pin.y, 1.12);
      const pB = viewPoint(pin.x, pin.y, -1.12);
      ctx.beginPath();
      ctx.moveTo(L.cx + pA[0] * L.s, L.cy - pA[1] * L.s);
      ctx.lineTo(L.cx + pB[0] * L.s, L.cy - pB[1] * L.s);
      ctx.strokeStyle = rgbStr(accent, 0.55);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
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
    pctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

    const px0 = 18, py0 = 26, side = 168;
    pctx.fillStyle = col.faint;
    pctx.fillText("mask S", px0, 16);
    for (let j = 0; j < 72; j++) {
      for (let i = 0; i < 72; i++) {
        const x = ((i + 0.5) / 72 - 0.5) * 2.2;
        const y = (0.5 - (j + 0.5) / 72) * 2.2;
        if (!inMask(x, y)) continue;
        pctx.fillStyle = theme === "uv" ? "rgba(239,231,255,0.88)" : "rgba(92,31,36,0.88)";
        pctx.fillRect(px0 + i * (side / 72), py0 + j * (side / 72), side / 72 + 0.4, side / 72 + 0.4);
      }
    }
    pctx.strokeStyle = col.rule;
    pctx.strokeRect(px0, py0, side, side);

    const sel = pin || { x: 0.58, y: 0 };
    const sx = px0 + (sel.x / 2.2 + 0.5) * side;
    const sy = py0 + (0.5 - sel.y / 2.2) * side;
    pctx.strokeStyle = col.accent;
    pctx.lineWidth = 1.4;
    pctx.beginPath(); pctx.arc(sx, sy, 5, 0, Math.PI * 2); pctx.stroke();
    pctx.lineWidth = 1;

    const zx = px0 + side + 36;
    const zy0 = 28, zh = 164;
    const zAt = z => zy0 + (1.15 - z) / 2.3 * zh;
    pctx.strokeStyle = col.rule;
    pctx.beginPath(); pctx.moveTo(zx, zAt(1.15)); pctx.lineTo(zx, zAt(-1.15)); pctx.stroke();
    pctx.fillStyle = col.faint;
    pctx.fillText("+z", zx - 2, zy0 - 6);
    pctx.fillText("−z", zx - 6, zy0 + zh + 12);

    const kinds = ["prism", "grade", "well"];
    const cols = { prism: col.accent, grade: col.warm, well: col.summary };
    const xOff = { prism: 18, grade: 52, well: 86 };
    for (const k of kinds) {
      const iv = intervals(k, sel.x, sel.y);
      const x = zx + xOff[k];
      pctx.fillStyle = col.faint;
      pctx.fillText(k[0].toUpperCase(), x - 2, zy0 + zh + 12);
      pctx.fillStyle = theme === "uv" ? "#2a2542" : "#d7ccc0";
      pctx.fillRect(x, zAt(1.0), 16, zAt(-1.0) - zAt(1.0));
      pctx.fillStyle = cols[k];
      pctx.globalAlpha = k === method ? 1 : 0.38;
      for (const [a, b] of iv) {
        const y1 = zAt(b), y2 = zAt(a);
        pctx.fillRect(x, y1, 16, Math.max(2, y2 - y1));
      }
      pctx.globalAlpha = 1;
      if (k === method) {
        pctx.strokeStyle = col.ink;
        pctx.strokeRect(x - 0.5, zAt(1.0) - 0.5, 17, zAt(-1.0) - zAt(1.0) + 1);
      }
    }
    pctx.fillStyle = col.muted;
    pctx.fillText("x " + sel.x.toFixed(2) + "  y " + sel.y.toFixed(2), zx + 18, 16);
    const ivs = intervals(method, sel.x, sel.y);
    pctx.fillStyle = col.faint;
    pctx.fillText(ivs.length ? (ivs.length + " interval" + (ivs.length > 1 ? "s" : "")) : "outside S", zx + 18, 186);
  }

  function screenWorld(mx, my) {
    const L = fieldLayout();
    return { sx: (mx - L.cx) / L.s, sy: (L.cy - my) / L.s, L };
  }

  function pickOnBody(mx, my) {
    const { sx, sy } = screenWorld(mx, my);
    const list = boxes[method];
    let best = null, bd = 0.085;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const zm = 0.5 * (b.z0 + b.z1);
      const p = viewPoint(b.x, b.y, zm);
      const d = (p[0] - sx) * (p[0] - sx) + (p[1] - sy) * (p[1] - sy);
      if (d < bd) { bd = d; best = { x: b.x, y: b.y }; }
    }
    return best;
  }

  function pickOnPlane(mx, my) {
    const { sx, sy } = screenWorld(mx, my);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), syw = Math.sin(yaw);
    if (Math.abs(cp) < 0.25 || Math.abs(cy) < 0.25) return null;
    const y = sy / cp;
    const x = (sx - y * sp * syw) / cy;
    return { x, y };
  }

  function worldFromEvent(ev) {
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    return pickOnBody(mx, my) || pickOnPlane(mx, my);
  }

  function applyMeta() {
    const e = META[method];
    document.getElementById("methodIndex").textContent = e.index;
    document.getElementById("methodName").textContent = e.name;
    document.getElementById("methodClaim").textContent = e.claim;
    document.getElementById("methodNote").textContent = e.note;
    document.getElementById("plateTitle").textContent = e.plateTitle;
    document.getElementById("plateCaption").textContent = e.plateCaption;
    document.getElementById("plateSide").textContent = e.plateSide;
    document.querySelectorAll(".method-nav button").forEach(btn => {
      const on = btn.dataset.method === method;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.getElementById("faceBtn").classList.toggle("is-active", isFace());
    document.getElementById("faceBtn").setAttribute("aria-pressed", isFace() ? "true" : "false");
    document.getElementById("ghostBtn").classList.toggle("is-active", showGhost);
    document.getElementById("ghostBtn").setAttribute("aria-pressed", showGhost ? "true" : "false");
    document.getElementById("ghostKey").classList.toggle("is-visible", showGhost);
    document.getElementById("ghostKey").setAttribute("aria-hidden", showGhost ? "false" : "true");
    document.getElementById("faceKey").classList.toggle("is-visible", isFace());
    document.getElementById("faceKey").setAttribute("aria-hidden", isFace() ? "false" : "true");
    document.getElementById("statMask").textContent = audit.mismatch === 0 ? "0 px" : audit.mismatch + " px";
    document.getElementById("statVol").textContent = volumes[method].toFixed(2);
    const sel = pin || { x: 0.58, y: 0 };
    const iv = intervals(method, sel.x, sel.y);
    document.getElementById("statRay").textContent = iv.length === 0 ? "void" : (iv.length === 1 ? "1 span" : iv.length + " spans");
    document.getElementById("statView").textContent = isFace() ? "FACE" : "OFF";
    document.getElementById("live").textContent =
      e.name + ". " + e.claim + ". Canonical mask mismatch " + audit.mismatch +
      " pixels at " + AUDIT + " square. Volume " + volumes[method].toFixed(2) + ".";
    drawPlate();
  }

  function setTheme(next) {
    theme = next;
    cachedCol = null;
    app.className = "same-shadow theme-" + theme;
    document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
    document.getElementById("uvLabel").classList.toggle("is-active", theme === "uv");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "paper" ? "#e7dfd2" : "#0D0B18");
    drawPlate();
  }
  function selectMethod(next) {
    if (next === method) return;
    method = next;
    applyMeta();
  }
  function faceView() {
    snapFace = true;
    faceT0 = performance.now();
    faceFromY = yaw;
    faceFromP = pitch;
    vYaw = 0; vPitch = 0;
    if (reduced.matches) { yaw = 0; pitch = 0; snapFace = false; }
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
  }

  function overChrome(el) {
    return !!el.closest?.(".use-plate, .method-nav, .study-tools, .theme-switch, .field-fallback, .series-chip, .study-registration, .study-header, a");
  }

  stage.addEventListener("pointerdown", ev => {
    if (ev.button !== 0 || overChrome(ev.target)) return;
    dragging = true; moved = 0;
    lx = ev.clientX; ly = ev.clientY; lt = performance.now();
    vYaw = 0; vPitch = 0; snapFace = false;
    stage.setPointerCapture(ev.pointerId);
    stage.dataset.dragging = "true";
  });
  stage.addEventListener("pointermove", ev => {
    if (!dragging) return;
    ev.preventDefault();
    const now = performance.now();
    const dx = ev.clientX - lx, dy = ev.clientY - ly;
    moved += Math.abs(dx) + Math.abs(dy);
    const dt = Math.max(8, now - lt);
    yaw += dx * 0.008;
    pitch = Math.max(-1.15, Math.min(1.15, pitch + dy * 0.006));
    vYaw = dx / dt * 16 * 0.008;
    vPitch = dy / dt * 16 * 0.006;
    lx = ev.clientX; ly = ev.clientY; lt = now;
    document.getElementById("statView").textContent = isFace() ? "FACE" : "OFF";
    document.getElementById("faceBtn").classList.toggle("is-active", isFace());
  });
  function endDrag(ev) {
    if (!dragging) return;
    dragging = false;
    delete stage.dataset.dragging;
    if (stage.hasPointerCapture(ev.pointerId)) stage.releasePointerCapture(ev.pointerId);
    if (moved < 8) {
      const w = worldFromEvent(ev);
      if (w) {
        pin = pin && Math.hypot(pin.x - w.x, pin.y - w.y) < 0.08 ? null : { x: w.x, y: w.y };
      }
      document.getElementById("usePlate").classList.toggle("is-inspecting", !!pin);
      applyMeta();
    }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  document.getElementById("themeBtn").addEventListener("click", () => setTheme(theme === "uv" ? "paper" : "uv"));
  document.querySelectorAll(".method-nav button").forEach(btn => {
    btn.addEventListener("click", () => selectMethod(btn.dataset.method));
  });
  document.getElementById("faceBtn").addEventListener("click", faceView);
  document.getElementById("ghostBtn").addEventListener("click", () => {
    showGhost = !showGhost;
    applyMeta();
  });

  window.addEventListener("keydown", ev => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "1") selectMethod("prism");
    else if (ev.key === "2") selectMethod("grade");
    else if (ev.key === "3") selectMethod("well");
    else if (ev.key === "t" || ev.key === "T") setTheme(theme === "uv" ? "paper" : "uv");
    else if (ev.key === "f" || ev.key === "F" || ev.key === " ") { ev.preventDefault(); faceView(); }
    else if (ev.key === "g" || ev.key === "G") { showGhost = !showGhost; applyMeta(); }
    else if (ev.key === "Escape") { pin = null; document.getElementById("usePlate").classList.remove("is-inspecting"); applyMeta(); }
    else if (ev.key === "ArrowLeft") { yaw -= 0.12; snapFace = false; applyMeta(); }
    else if (ev.key === "ArrowRight") { yaw += 0.12; snapFace = false; applyMeta(); }
    else if (ev.key === "ArrowUp") { pitch = Math.min(1.15, pitch + 0.08); snapFace = false; applyMeta(); }
    else if (ev.key === "ArrowDown") { pitch = Math.max(-1.15, pitch - 0.08); snapFace = false; applyMeta(); }
  });

  const plateEl = document.getElementById("usePlate");
  plateEl.addEventListener("pointerenter", () => plateEl.classList.add("is-inspecting"));
  plateEl.addEventListener("pointerleave", () => { if (!pin) plateEl.classList.remove("is-inspecting"); });
  plateEl.addEventListener("pointerdown", ev => {
    const r = plate.getBoundingClientRect();
    const mx = (ev.clientX - r.left) / Math.max(1, r.width) * plate.width;
    const my = (ev.clientY - r.top) / Math.max(1, r.height) * plate.height;
    const px0 = 18, py0 = 26, side = 168;
    if (mx >= px0 && mx <= px0 + side && my >= py0 && my <= py0 + side) {
      ev.stopPropagation();
      const x = ((mx - px0) / side - 0.5) * 2.2;
      const y = (0.5 - (my - py0) / side) * 2.2;
      pin = { x, y };
      plateEl.classList.add("is-inspecting");
      applyMeta();
    }
  });

  function syncViewChrome() {
    const face = isFace();
    const label = face ? "FACE" : "OFF";
    if (label !== lastViewLabel) {
      lastViewLabel = label;
      document.getElementById("statView").textContent = label;
      document.getElementById("faceBtn").classList.toggle("is-active", face);
      document.getElementById("faceBtn").setAttribute("aria-pressed", face ? "true" : "false");
      document.getElementById("faceKey").classList.toggle("is-visible", face);
      document.getElementById("faceKey").setAttribute("aria-hidden", face ? "false" : "true");
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - last); last = now;
    let moving = dragging || snapFace || Math.abs(vYaw) + Math.abs(vPitch) > 1e-4;
    if (snapFace) {
      const t = reduced.matches ? 1 : Math.min(1, (now - faceT0) / 640);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      yaw = faceFromY * (1 - e);
      pitch = faceFromP * (1 - e);
      if (t >= 1) { snapFace = false; yaw = 0; pitch = 0; applyMeta(); }
    } else if (!dragging && !reduced.matches) {
      yaw += vYaw * dt / 16.67;
      pitch = Math.max(-1.15, Math.min(1.15, pitch + vPitch * dt / 16.67));
      const damp = Math.pow(0.90, dt / 16.67);
      vYaw *= damp; vPitch *= damp;
      if (Math.abs(vYaw) < 1e-4) vYaw = 0;
      if (Math.abs(vPitch) < 1e-4) vPitch = 0;
    }
    syncViewChrome();
    const key = method + "|" + theme + "|" + (showGhost ? 1 : 0) + "|" +
      yaw.toFixed(4) + "|" + pitch.toFixed(4) + "|" +
      (pin ? pin.x.toFixed(3) + "," + pin.y.toFixed(3) : ".") + "|" + W + "x" + H;
    if (key !== lastDrawKey || moving) {
      lastDrawKey = key;
      drawField();
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  resize();
  app.className = "same-shadow theme-" + theme;
  document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
  document.getElementById("uvLabel").classList.toggle("is-active", theme === "uv");
  document.getElementById("usePlate").classList.add("is-inspecting");
  applyMeta();
  loader.classList.add("is-hidden");
  document.getElementById("live").textContent =
    "Three bodies formed. Shared silhouette S is a rounded cross. Mask mismatch " +
    audit.mismatch + " of " + (AUDIT * AUDIT) + " at the canonical orthographic −Z projection. " +
    "Prism volume " + volumes.prism.toFixed(2) + ", grade " + volumes.grade.toFixed(2) +
    ", well " + volumes.well.toFixed(2) + ".";
  requestAnimationFrame(loop);
}
I();
