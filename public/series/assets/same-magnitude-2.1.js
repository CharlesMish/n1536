
(function () {
  const N = 128;
  const N2 = N * N;
  const SEED = 20260903;
  const DUR = 1200;
  const TAU = Math.PI * 2;

  const META = {
    source: {
      index: "01", name: "Source", claim: "Kept phase",
      note: "The amplitudes stay with the angles that made the picture. Structure is the thing you keep.",
      plateTitle: "Fig. 01 — source spectrum", plateCaption: "A face, seated in its own phase.",
      plateSide: "original φ", seed: "kept"
    },
    borrowed: {
      index: "02", name: "Borrowed", claim: "Foreign phase",
      note: "Every |F(k)| is the face’s. The angles come from a second deterministic field — a house.",
      plateTitle: "Fig. 02 — borrowed angles", plateCaption: "Same A(k), house phase.",
      plateSide: "donor φ", seed: "house"
    },
    scrambled: {
      index: "03", name: "Scrambled", claim: "Frozen phase",
      note: "The same A(k) with a seeded Hermitian random phase. Energy without an intended picture.",
      plateTitle: "Fig. 03 — frozen angles", plateCaption: "Same A(k), no intended picture.",
      plateSide: "seed 20260903", seed: "20260903"
    }
  };

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function fft1d(re, im, n, off, stride, inverse) {
    let j = 0;
    for (let i = 0; i < n; i++) {
      if (i < j) {
        const ia = off + i * stride, ja = off + j * stride;
        let t = re[ia]; re[ia] = re[ja]; re[ja] = t;
        t = im[ia]; im[ia] = im[ja]; im[ja] = t;
      }
      let m = n >> 1;
      while (m >= 1 && j >= m) { j -= m; m >>= 1; }
      j += m;
    }
    const sign = inverse ? 1 : -1;
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const theta = sign * TAU / size;
      const wr0 = Math.cos(theta), wi0 = Math.sin(theta);
      for (let i0 = 0; i0 < n; i0 += size) {
        let wr = 1, wi = 0;
        for (let k = 0; k < half; k++) {
          const even = off + (i0 + k) * stride;
          const odd = off + (i0 + k + half) * stride;
          const tr = wr * re[odd] - wi * im[odd];
          const ti = wr * im[odd] + wi * re[odd];
          re[odd] = re[even] - tr;
          im[odd] = im[even] - ti;
          re[even] += tr;
          im[even] += ti;
          const nwr = wr * wr0 - wi * wi0;
          wi = wr * wi0 + wi * wr0;
          wr = nwr;
        }
      }
    }
    if (inverse) {
      const s = 1 / n;
      for (let i = 0; i < n; i++) {
        const a = off + i * stride;
        re[a] *= s; im[a] *= s;
      }
    }
  }

  function fft2d(re, im, inverse) {
    for (let y = 0; y < N; y++) fft1d(re, im, N, y * N, 1, inverse);
    for (let x = 0; x < N; x++) fft1d(re, im, N, x, N, inverse);
  }

  function wrapAngle(ph) {
    ph = (ph + Math.PI) % TAU;
    if (ph < 0) ph += TAU;
    return ph - Math.PI;
  }

  function smoothstep(e0, e1, v) {
    const t = Math.max(0, Math.min(1, (v - e0) / Math.max(1e-12, e1 - e0)));
    return t * t * (3 - 2 * t);
  }

  function paintScalar(out, fn) {
    for (let y = 0; y < N; y++) {
      const py = (y + 0.5) / N;
      for (let x = 0; x < N; x++) {
        const px = (x + 0.5) / N;
        out[y * N + x] = fn(px, py);
      }
    }
    return out;
  }

  function disk(px, py, cx, cy, r, soft) {
    const d = Math.hypot(px - cx, py - cy);
    return 1 - smoothstep(r - soft, r + soft, d);
  }
  function rect(px, py, x0, y0, x1, y1, soft) {
    return smoothstep(x0, x0 + soft, px) * (1 - smoothstep(x1 - soft, x1, px)) *
           smoothstep(y0, y0 + soft, py) * (1 - smoothstep(y1 - soft, y1, py));
  }

  function makeSource() {
    const out = new Float64Array(N2);
    paintScalar(out, (px, py) => {
      let s = 0.16 + 0.10 * (1 - py);
      s += 0.62 * disk(px, py, 0.50, 0.34, 0.26, 0.016);
      s += 0.12 * disk(px, py, 0.50, 0.24, 0.24, 0.02) * (py < 0.34 ? 1 : 0);
      s -= 0.50 * disk(px, py, 0.40, 0.32, 0.055, 0.008);
      s -= 0.50 * disk(px, py, 0.60, 0.32, 0.055, 0.008);
      s += 0.18 * disk(px, py, 0.41, 0.31, 0.018, 0.006);
      s += 0.18 * disk(px, py, 0.61, 0.31, 0.018, 0.006);
      s -= 0.18 * rect(px, py, 0.33, 0.255, 0.47, 0.275, 0.006);
      s -= 0.18 * rect(px, py, 0.53, 0.255, 0.67, 0.275, 0.006);
      s -= 0.16 * disk(px, py, 0.50, 0.40, 0.028, 0.008);
      const ang = Math.atan2(py - 0.40, px - 0.50);
      const rad = Math.hypot(px - 0.50, py - 0.40);
      if (rad > 0.11 && rad < 0.155 && ang > 0.45 && ang < Math.PI - 0.45) s -= 0.42;
      s += 0.40 * rect(px, py, 0.28, 0.60, 0.72, 0.96, 0.02);
      s += 0.22 * disk(px, py, 0.50, 0.62, 0.22, 0.02) * (py > 0.55 ? 1 : 0);
      s += 0.15 * disk(px, py, 0.50, 0.72, 0.018, 0.005);
      s += 0.15 * disk(px, py, 0.50, 0.80, 0.018, 0.005);
      s += 0.15 * disk(px, py, 0.50, 0.88, 0.018, 0.005);
      s += 0.06 * Math.sin(TAU * px * 18) * rect(px, py, 0.28, 0.62, 0.72, 0.96, 0.02);
      return s;
    });
    return out;
  }

  function makeDonor() {
    const out = new Float64Array(N2);
    paintScalar(out, (px, py) => {
      let s = 0.10 + 0.22 * py;
      s += 0.12 * smoothstep(0.82, 0.88, py);
      s += 0.58 * rect(px, py, 0.24, 0.46, 0.76, 0.86, 0.012);
      const roofD = Math.abs(px - 0.50) / 0.34 + (py - 0.22) / 0.28;
      if (py < 0.50 && py > 0.18) s += 0.55 * (1 - smoothstep(0.92, 1.05, roofD));
      s -= 0.28 * rect(px, py, 0.45, 0.64, 0.55, 0.86, 0.008);
      s += 0.30 * rect(px, py, 0.30, 0.52, 0.40, 0.60, 0.005);
      s += 0.30 * rect(px, py, 0.62, 0.52, 0.72, 0.60, 0.005);
      s += 0.30 * rect(px, py, 0.30, 0.62, 0.40, 0.70, 0.005);
      s += 0.30 * rect(px, py, 0.62, 0.62, 0.72, 0.70, 0.005);
      s += 0.35 * rect(px, py, 0.62, 0.22, 0.70, 0.40, 0.008);
      s += 0.50 * disk(px, py, 0.14, 0.16, 0.09, 0.015);
      const fence = Math.pow(Math.sin(TAU * px * 16), 8);
      s += 0.16 * fence * rect(px, py, 0.0, 0.84, 1.0, 0.92, 0.01);
      return s;
    });
    return out;
  }

  function spectrumOf(field) {
    const re = Float64Array.from(field);
    const im = new Float64Array(N2);
    fft2d(re, im, false);
    return { re, im };
  }

  function isSelf(u, v) {
    return (u === (N - u) % N) && (v === (N - v) % N);
  }

  function buildSpectrum(mag, srcSpec, donorSpec, mode, seed) {
    const re = new Float64Array(N2);
    const im = new Float64Array(N2);
    const phase = new Float64Array(N2);
    const signNy = new Int8Array(N2);
    const rng = mulberry32(seed >>> 0);
    const seen = new Uint8Array(N2);
    re[0] = srcSpec.re[0];
    im[0] = 0;
    phase[0] = 0;
    signNy[0] = srcSpec.re[0] >= 0 ? 1 : -1;
    seen[0] = 1;
    for (let v = 0; v < N; v++) {
      for (let u = 0; u < N; u++) {
        const e = v * N + u;
        if (seen[e]) continue;
        const uc = (N - u) % N, vc = (N - v) % N;
        const c = vc * N + uc;
        const A = mag[e];
        if (isSelf(u, v)) {
          let s;
          if (mode === "source") s = srcSpec.re[e] >= 0 ? 1 : -1;
          else if (mode === "borrowed") s = donorSpec.re[e] >= 0 ? 1 : -1;
          else s = rng() < 0.5 ? 1 : -1;
          re[e] = s * A;
          im[e] = 0;
          phase[e] = s >= 0 ? 0 : Math.PI;
          signNy[e] = s;
          seen[e] = 1;
        } else {
          let ph;
          if (mode === "source") ph = Math.atan2(srcSpec.im[e], srcSpec.re[e]);
          else if (mode === "borrowed") ph = Math.atan2(donorSpec.im[e], donorSpec.re[e]);
          else ph = rng() * TAU;
          re[e] = A * Math.cos(ph);
          im[e] = A * Math.sin(ph);
          re[c] = re[e];
          im[c] = -im[e];
          phase[e] = ph;
          phase[c] = -ph;
          seen[e] = 1;
          seen[c] = 1;
        }
      }
    }
    return { re, im, phase, signNy };
  }

  function invert(spec) {
    const re = Float64Array.from(spec.re);
    const im = Float64Array.from(spec.im);
    fft2d(re, im, true);
    let imagMax = 0, fmin = Infinity, fmax = -Infinity, energy = 0;
    const field = new Float64Array(N2);
    for (let i = 0; i < N2; i++) {
      const rv = re[i];
      const iv = im[i];
      field[i] = rv;
      energy += rv * rv;
      if (Math.abs(iv) > imagMax) imagMax = Math.abs(iv);
      if (rv < fmin) fmin = rv;
      if (rv > fmax) fmax = rv;
    }
    return { field, imagMax, fmin, fmax, energy };
  }

  function auditMagnitude(field, magRef) {
    const spec = spectrumOf(field);
    let maxAbs = 0, maxRel = 0, maxA = 0;
    for (let i = 0; i < N2; i++) {
      const A = Math.hypot(spec.re[i], spec.im[i]);
      if (magRef[i] > maxA) maxA = magRef[i];
      const d = Math.abs(A - magRef[i]);
      if (d > maxAbs) maxAbs = d;
    }
    maxRel = maxAbs / Math.max(maxA, 1e-30);
    return { maxAbs, maxRel, maxA };
  }

  function hermitError(spec) {
    let e = 0;
    for (let v = 0; v < N; v++) {
      for (let u = 0; u < N; u++) {
        const e0 = v * N + u;
        const e1 = ((N - v) % N) * N + ((N - u) % N);
        const dr = spec.re[e0] - spec.re[e1];
        const di = spec.im[e0] + spec.im[e1];
        const d = Math.hypot(dr, di);
        if (d > e) e = d;
      }
    }
    return e;
  }

  function wrapPi(d) {
    return wrapAngle(d);
  }

  function lerpAngle(a, b, t) {
    return wrapAngle(a + wrapPi(b - a) * t);
  }

  function hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function lerp3(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  function ease(t) {
    return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }
  function fmtSci(x) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const ax = Math.abs(x);
    if (ax >= 1 && ax < 10) return x.toFixed(2);
    if (ax >= 0.01 && ax < 100) return x.toFixed(3);
    return x.toExponential(1).replace("e+", "e").replace("e-0", "e-");
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

    let theme = "uv", method = "source";
    let showMag = false, showPhase = false;
    let pin = -1, hover = -1, pinK = -1;
    let W = 1, H = 1, PR = 1;
    let mix = 1, morphing = false, morphT0 = 0, morphFrom = "source", morphTo = "source";

    const pack = Object.create(null);
    let mag = null, logMag = null, logMax = 1, dc = 0;
    let gmin = 0, gmax = 1, specEnergy = 1;
    let ready = false;
    let colors = null;
    let frameView = null, frameViewKey = "";
    let magSheetDirty = true, phaseSheetDirty = true;

    const off = document.createElement("canvas");
    off.width = N; off.height = N;
    const octx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx || !pctx || !octx) {
      loader.classList.add("is-hidden");
      fallback.hidden = false;
      return;
    }
    const img = octx.createImageData(N, N);
    const magImg = octx.createImageData(N, N);
    const phaseImg = octx.createImageData(N, N);

    const css = () => getComputedStyle(app);
    function readColors(force) {
      if (colors && !force) return colors;
      const s = css();
      colors = {
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
      return colors;
    }

    function formField() {
      try {
        const src = makeSource();
        const donor = makeDonor();
        const Fs = spectrumOf(src);
        const Fd = spectrumOf(donor);
        mag = new Float64Array(N2);
        logMag = new Float64Array(N2);
        let maxA = 0, eSpec = 0;
        for (let i = 0; i < N2; i++) {
          mag[i] = Math.hypot(Fs.re[i], Fs.im[i]);
          if (mag[i] > maxA) maxA = mag[i];
          eSpec += mag[i] * mag[i];
        }
        specEnergy = eSpec / N2;
        dc = Fs.re[0];
        for (let i = 0; i < N2; i++) logMag[i] = Math.log(1 + mag[i]);
        logMax = Math.log(1 + maxA);

        const modes = ["source", "borrowed", "scrambled"];
        gmin = Infinity; gmax = -Infinity;
        for (const m of modes) {
          const spec = buildSpectrum(mag, Fs, Fd, m, SEED);
          const inv = invert(spec);
          const aud = auditMagnitude(inv.field, mag);
          const herr = hermitError(spec);
          pack[m] = {
            spec, field: inv.field, imagMax: inv.imagMax,
            energy: inv.energy, audit: aud, herm: herr,
            fmin: inv.fmin, fmax: inv.fmax
          };
          if (inv.fmin < gmin) gmin = inv.fmin;
          if (inv.fmax > gmax) gmax = inv.fmax;
        }
        const pad = 0.03 * (gmax - gmin || 1);
        gmin -= pad; gmax += pad;
        ready = true;
        return true;
      } catch (err) {
        console.error(err);
        return false;
      }
    }

    function currentSpecMix() {
      if (!ready) return null;
      const tRaw = (!morphing || mix >= 1 || reduced.matches) ? 1 : mix;
      const key = method + "|" + (tRaw >= 1 ? "1" : tRaw.toFixed(4)) + "|" + morphFrom + "|" + morphTo;
      if (frameView && frameViewKey === key) return frameView;
      if (!morphing || mix >= 1 || reduced.matches) {
        frameView = pack[method];
        frameViewKey = key;
        return frameView;
      }
      const a = pack[morphFrom], b = pack[morphTo];
      if (!a || !b) {
        frameView = pack[method];
        frameViewKey = key;
        return frameView;
      }
      const t = ease(mix);
      const re = new Float64Array(N2);
      const im = new Float64Array(N2);
      const phase = new Float64Array(N2);
      const seen = new Uint8Array(N2);
      re[0] = dc; im[0] = 0; phase[0] = 0; seen[0] = 1;
      for (let v = 0; v < N; v++) {
        for (let u = 0; u < N; u++) {
          const e = v * N + u;
          if (seen[e]) continue;
          const uc = (N - u) % N, vc = (N - v) % N;
          const c = vc * N + uc;
          const A = mag[e];
          if (isSelf(u, v)) {
            const sa = a.spec.signNy[e], sb = b.spec.signNy[e];
            const s = t < 0.5 ? sa : sb;
            re[e] = s * A; im[e] = 0;
            phase[e] = s >= 0 ? 0 : Math.PI;
            seen[e] = 1;
          } else {
            const ph = lerpAngle(a.spec.phase[e], b.spec.phase[e], t);
            re[e] = A * Math.cos(ph);
            im[e] = A * Math.sin(ph);
            re[c] = re[e]; im[c] = -im[e];
            phase[e] = ph; phase[c] = -ph;
            seen[e] = 1; seen[c] = 1;
          }
        }
      }
      const spec = { re, im, phase, signNy: t < 0.5 ? a.spec.signNy : b.spec.signNy };
      const inv = invert(spec);
      frameView = { spec, field: inv.field, imagMax: inv.imagMax, energy: inv.energy, presentation: true };
      frameViewKey = key;
      phaseSheetDirty = true;
      return frameView;
    }

    function fieldRect() {
      if(W<=700)return {x:20,y:12,w:W-40,h:H-24};
      const top = Math.min(H * 0.24, 188);
      const bot = Math.min(H * 0.30, 230);
      const left = W > 860 ? Math.min(W * 0.24, 340) : Math.min(W * 0.08, 36);
      const right = W > 860 ? Math.min(W * 0.32, 380) : Math.min(W * 0.08, 36);
      return { x: left, y: top, w: Math.max(40, W - left - right), h: Math.max(40, H - top - bot) };
    }
    function domainLayout() {
      const r = fieldRect();
      const s = Math.min(r.w / N, r.h / N) * 0.92;
      const dw = N * s, dh = N * s;
      return { s, dw, dh, x: r.x + (r.w - dw) / 2, y: r.y + (r.h - dh) / 2 };
    }

    function phaseRgb(ph, col, energy) {
      const h = (wrapAngle(ph) / Math.PI + 1) * 0.5;
      const acc = hexToRgb(col.accent), sum = hexToRgb(col.summary), warm = hexToRgb(col.warm);
      let rgb;
      if (h < 0.5) rgb = lerp3(acc, sum, h / 0.5);
      else rgb = lerp3(sum, warm, (h - 0.5) / 0.5);
      const e = energy == null ? 1 : energy;
      return [rgb[0] * e, rgb[1] * e, rgb[2] * e];
    }

    function drawMainPixels(view, col) {
      const data = img.data;
      const solid = hexToRgb(col.solid), voidc = hexToRgb(col.voidc);
      const span = Math.max(1e-12, gmax - gmin);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const e = y * N + x;
          let rgb, a = 255;
          if (showMag) {
            const us = ((y + N / 2) % N) * N + ((x + N / 2) % N);
            const t = logMag[us] / Math.max(1e-12, logMax);
            rgb = lerp3(voidc, hexToRgb(col.alert), Math.pow(t, 0.72));
            a = theme === "uv" ? Math.floor(40 + 215 * t) : 255;
          } else if (showPhase) {
            const us = ((y + N / 2) % N) * N + ((x + N / 2) % N);
            const ph = view.spec.phase[us];
            const tA = logMag[us] / Math.max(1e-12, logMax);
            rgb = phaseRgb(ph, col, 0.35 + 0.65 * tA);
          } else {
            const t = (view.field[e] - gmin) / span;
            rgb = lerp3(voidc, solid, Math.max(0, Math.min(1, t)));
            a = theme === "uv" ? Math.floor(50 + 205 * Math.max(0, Math.min(1, t))) : 255;
          }
          const p = e * 4;
          data[p] = rgb[0] | 0;
          data[p + 1] = rgb[1] | 0;
          data[p + 2] = rgb[2] | 0;
          data[p + 3] = a;
        }
      }
      octx.putImageData(img, 0, 0);
    }

    function drawField() {
      const col = readColors();
      ctx.setTransform(PR, 0, 0, PR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const L = domainLayout();
      ctx.save();
      ctx.fillStyle = theme === "uv" ? "rgba(18,16,34,0.78)" : "rgba(245,239,228,0.62)";
      ctx.fillRect(L.x, L.y, L.dw, L.dh);
      ctx.strokeStyle = col.rule; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
      ctx.strokeRect(L.x - 0.5, L.y - 0.5, L.dw + 1, L.dh + 1);
      ctx.globalAlpha = 1;
      if (ready) {
        const view = currentSpecMix();
        if (view) {
          drawMainPixels(view, col);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(off, 0, 0, N, N, L.x, L.y, L.dw, L.dh);
        }
        const mark = pin >= 0 ? pin : hover;
        if (mark >= 0 && !showMag && !showPhase) {
          const i = mark % N, j = (mark / N) | 0;
          ctx.strokeStyle = pin >= 0 ? col.accent : col.warm;
          ctx.lineWidth = pin >= 0 ? 1.6 : 1;
          ctx.strokeRect(L.x + i * L.s + 0.5, L.y + j * L.s + 0.5, L.s - 1, L.s - 1);
        }
        if ((showMag || showPhase) && pinK >= 0) {
          const u = pinK % N, v = (pinK / N) | 0;
          const sx = (u + N / 2) % N, sy = (v + N / 2) % N;
          ctx.strokeStyle = col.accent;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(L.x + sx * L.s + 0.5, L.y + sy * L.s + 0.5, L.s - 1, L.s - 1);
        }
      }
      ctx.restore();
    }

    function fillSpectrumSheet(imageData, kind, view, col) {
      const data = imageData.data;
      const voidc = hexToRgb(col.voidc);
      const alert = hexToRgb(col.alert);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const us = ((y + N / 2) % N) * N + ((x + N / 2) % N);
          const t = logMag[us] / Math.max(1e-12, logMax);
          let rgb;
          if (kind === "mag") rgb = lerp3(voidc, alert, Math.pow(t, 0.72));
          else rgb = phaseRgb(view.spec.phase[us], col, 0.28 + 0.72 * t);
          const p = (y * N + x) * 4;
          data[p] = rgb[0] | 0;
          data[p + 1] = rgb[1] | 0;
          data[p + 2] = rgb[2] | 0;
          data[p + 3] = 255;
        }
      }
    }

    function signedBin(k) {
      return k > N / 2 ? k - N : k;
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
      if (!ready) return;
      const view = currentSpecMix();
      if (magSheetDirty) {
        fillSpectrumSheet(magImg, "mag", view, col);
        magSheetDirty = false;
      }
      if (phaseSheetDirty) {
        fillSpectrumSheet(phaseImg, "phase", view, col);
        phaseSheetDirty = false;
      }
      const panelW = 168, cell = panelW / N;
      const x0 = 16, y0 = 28;
      const x1 = 16 + panelW + 18;
      pctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      pctx.fillStyle = col.faint;
      pctx.fillText("log |F|  ·  shared", x0, 18);
      pctx.fillText("φ  ·  this claim", x1, 18);
      pctx.imageSmoothingEnabled = false;
      octx.putImageData(magImg, 0, 0);
      pctx.drawImage(off, 0, 0, N, N, x0, y0, panelW, panelW);
      octx.putImageData(phaseImg, 0, 0);
      pctx.drawImage(off, 0, 0, N, N, x1, y0, panelW, panelW);
      pctx.strokeStyle = col.rule;
      pctx.strokeRect(x0 - 0.5, y0 - 0.5, panelW + 1, panelW + 1);
      pctx.strokeRect(x1 - 0.5, y0 - 0.5, panelW + 1, panelW + 1);

      const k = pinK >= 0 ? pinK : 0;
      const ku = k % N, kv = (k / N) | 0;
      const sx = (ku + N / 2) % N, sy = (kv + N / 2) % N;
      pctx.strokeStyle = col.accent;
      pctx.strokeRect(x0 + sx * cell - 0.5, y0 + sy * cell - 0.5, cell + 1, cell + 1);
      pctx.strokeRect(x1 + sx * cell - 0.5, y0 + sy * cell - 0.5, cell + 1, cell + 1);

      const barX = x1 + panelW + 16;
      const A = mag[k];
      const ph = wrapAngle(view.spec.phase[k]);
      pctx.fillStyle = col.faint;
      pctx.fillText("bin  u " + signedBin(ku) + "  v " + signedBin(kv), barX, 40);
      pctx.fillText("|F|  " + fmtSci(A), barX, 58);
      pctx.fillText("φ    " + (ph * 180 / Math.PI).toFixed(1) + "°", barX, 76);
      const spat = pin >= 0 ? pin : hover >= 0 ? hover : (N / 2) * N + (N / 2);
      const sx2 = spat % N, sy2 = (spat / N) | 0;
      const raw = view.field[spat];
      const mapped = (raw - gmin) / Math.max(1e-12, gmax - gmin);
      pctx.fillText("cell " + sx2 + "," + sy2, barX, 108);
      pctx.fillText("value " + raw.toFixed(3), barX, 126);
      pctx.fillText("disp  " + mapped.toFixed(3), barX, 144);
      pctx.fillText(view.presentation ? "phase path" : "endpoint", barX, 168);
      pctx.fillText("common affine", barX, 186);
    }

    function hitField(mx, my) {
      const L = domainLayout();
      const i = Math.floor((mx - L.x) / L.s);
      const j = Math.floor((my - L.y) / L.s);
      if (i < 0 || j < 0 || i >= N || j >= N) return -1;
      return j * N + i;
    }
    function hitPlate(mx, my) {
      const rect = plate.getBoundingClientRect();
      const x = (mx - rect.left) * (plate.width / rect.width);
      const y = (my - rect.top) * (plate.height / rect.height);
      const panelW = 168, cell = panelW / N, x0 = 16, y0 = 28, x1 = 16 + panelW + 18;
      function inside(ox) {
        const i = Math.floor((x - ox) / cell);
        const j = Math.floor((y - y0) / cell);
        if (i < 0 || j < 0 || i >= N || j >= N) return -1;
        const u = (i - N / 2 + N) % N;
        const v = (j - N / 2 + N) % N;
        return v * N + u;
      }
      const a = inside(x0);
      if (a >= 0) return a;
      return inside(x1);
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
      document.querySelectorAll(".method-nav button").forEach((btn) => {
        const on = btn.dataset.method === method;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      document.getElementById("magBtn").classList.toggle("is-active", showMag);
      document.getElementById("magBtn").setAttribute("aria-pressed", showMag ? "true" : "false");
      document.getElementById("phaseBtn").classList.toggle("is-active", showPhase);
      document.getElementById("phaseBtn").setAttribute("aria-pressed", showPhase ? "true" : "false");
      document.getElementById("magKey").classList.toggle("is-visible", showMag);
      document.getElementById("phaseKey").classList.toggle("is-visible", showPhase);
      document.getElementById("magKey").setAttribute("aria-hidden", showMag ? "false" : "true");
      document.getElementById("phaseKey").setAttribute("aria-hidden", showPhase ? "false" : "true");
      document.getElementById("dragNote").textContent = showMag || showPhase ? "Shared A(k) · click a bin" : "Click a cell";
      document.getElementById("live").textContent = e.name + ". " + e.claim + ". Same 128×128 Fourier magnitude.";
      phaseSheetDirty = true;
      updateReadout();
      drawPlate();
    }

    function updateReadout() {
      const pending = document.getElementById("methodPending");
      if (!ready) {
        document.getElementById("statDA").textContent = "—";
        document.getElementById("statIm").textContent = "—";
        document.getElementById("statE").textContent = "—";
        document.getElementById("statSeed").textContent = "—";
        if (pending) pending.hidden = false;
        return;
      }
      if (pending) pending.hidden = true;
      const slot = pack[method];
      document.getElementById("statDA").textContent = fmtSci(slot.audit.maxRel);
      document.getElementById("statIm").textContent = fmtSci(slot.imagMax);
      document.getElementById("statE").textContent = (slot.energy / specEnergy).toFixed(6);
      document.getElementById("statSeed").textContent = META[method].seed;
    }

    function setTheme(next) {
      theme = next;
      app.className = "same-magnitude theme-" + theme;
      document.getElementById("paperLabel").classList.toggle("is-active", theme === "paper");
      document.getElementById("uvLabel").classList.toggle("is-active", theme === "uv");
      document.getElementById("themeBtn").setAttribute(
        "aria-label",
        "Switch to " + (theme === "uv" ? "Paper" : "UV") + " presentation"
      );
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", theme === "uv" ? "#0D0B18" : "#E7DFD2");
      readColors(true);
      magSheetDirty = true;
      phaseSheetDirty = true;
      drawPlate();
    }

    function selectMethod(next) {
      if (next === method && !morphing) return;
      const canMorph = ready && !reduced.matches && pack[method] && pack[next];
      if (canMorph) {
        morphFrom = method; morphTo = next; mix = 0; morphing = true; morphT0 = performance.now();
      } else {
        morphing = false; mix = 1;
      }
      method = next;
      frameView = null;
      frameViewKey = "";
      phaseSheetDirty = true;
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

    function loop(now) {
      if (morphing) {
        mix = Math.min(1, (now - morphT0) / DUR);
        frameView = null;
        frameViewKey = "";
        phaseSheetDirty = true;
        if (mix >= 1) {
          morphing = false;
          mix = 1;
          updateReadout();
        }
        drawPlate();
      }
      drawField();
      requestAnimationFrame(loop);
    }

    document.getElementById("themeBtn").addEventListener("click", () => setTheme(theme === "uv" ? "paper" : "uv"));
    document.querySelectorAll(".method-nav button").forEach((btn) => {
      btn.addEventListener("click", () => selectMethod(btn.dataset.method));
    });
    document.getElementById("magBtn").addEventListener("click", () => {
      showMag = !showMag; if (showMag) showPhase = false; applyMeta();
    });
    document.getElementById("phaseBtn").addEventListener("click", () => {
      showPhase = !showPhase; if (showPhase) showMag = false; applyMeta();
    });
    stage.addEventListener("pointermove", (ev) => {
      const r = canvas.getBoundingClientRect();
      hover = hitField(ev.clientX - r.left, ev.clientY - r.top);
      if (hover >= 0) drawPlate();
    });
    stage.addEventListener("pointerdown", (ev) => {
      if (ev.target.closest && ev.target.closest(".use-plate, .method-nav, .study-tools, .theme-switch, .series-chip, .study-registration, .study-header, a")) return;
      const r = canvas.getBoundingClientRect();
      const h = hitField(ev.clientX - r.left, ev.clientY - r.top);
      if (h >= 0) {
        if (showMag || showPhase) {
          const i = h % N, j = (h / N) | 0;
          const u = (i - N / 2 + N) % N, v = (j - N / 2 + N) % N;
          const k = v * N + u;
          pinK = pinK === k ? -1 : k;
        } else {
          pin = pin === h ? -1 : h;
        }
        document.getElementById("usePlate").classList.toggle("is-inspecting", pin >= 0 || pinK >= 0);
        drawPlate();
      }
    });
    stage.addEventListener("pointerleave", () => { hover = -1; });
    plate.addEventListener("pointerdown", (ev) => {
      const k = hitPlate(ev.clientX, ev.clientY);
      if (k >= 0) {
        pinK = pinK === k ? -1 : k;
        document.getElementById("usePlate").classList.toggle("is-inspecting", pin >= 0 || pinK >= 0);
        drawPlate();
      }
    });
    window.addEventListener("keydown", (ev) => {
      if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (ev.key === "1") selectMethod("source");
      else if (ev.key === "2") selectMethod("borrowed");
      else if (ev.key === "3") selectMethod("scrambled");
      else if (ev.key === "t" || ev.key === "T") setTheme(theme === "uv" ? "paper" : "uv");
      else if (ev.key === "m" || ev.key === "M") { showMag = !showMag; if (showMag) showPhase = false; applyMeta(); }
      else if (ev.key === "p" || ev.key === "P") { showPhase = !showPhase; if (showPhase) showMag = false; applyMeta(); }
      else if (ev.key === "Escape") {
        pin = -1; pinK = -1;
        document.getElementById("usePlate").classList.remove("is-inspecting");
        drawPlate();
      }
    });
    window.addEventListener("resize", resize);
    if (reduced.addEventListener) {
      reduced.addEventListener("change", () => {
        if (reduced.matches && morphing) {
          morphing = false;
          mix = 1;
          frameView = null;
          frameViewKey = "";
          phaseSheetDirty = true;
          updateReadout();
          drawPlate();
        }
      });
    }

    function applyHash() {
      const boot = (location.hash || "").replace("#", "").toLowerCase();
      if (boot === "paper") setTheme("paper");
      if (boot === "uv") setTheme("uv");
      if (boot === "magnitude" || boot === "mag") { showMag = true; showPhase = false; }
      if (boot === "phase") { showPhase = true; showMag = false; }
      if (boot === "source" || boot === "borrowed" || boot === "scrambled") {
        method = boot;
        morphing = false;
        mix = 1;
      }
    }

    function settleLive() {
      const s = pack.source, b = pack.borrowed, c = pack.scrambled;
      document.getElementById("live").textContent =
        "Three fields settled. |F| Δ source " + fmtSci(s.audit.maxRel) +
        ", borrowed " + fmtSci(b.audit.maxRel) +
        ", scrambled " + fmtSci(c.audit.maxRel) +
        ". Imag residual " + fmtSci(Math.max(s.imagMax, b.imagMax, c.imagMax)) +
        ". Hermitian err " + fmtSci(Math.max(s.herm, b.herm, c.herm)) + ".";
    }

    resize();
    applyHash();
    applyMeta();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ok = formField();
        if (!ok) {
          loader.classList.add("is-hidden");
          fallback.hidden = false;
          return;
        }
        magSheetDirty = true;
        phaseSheetDirty = true;
        loader.classList.add("is-hidden");
        updateReadout();
        drawPlate();
        settleLive();
        requestAnimationFrame(loop);
      });
    });
  }

  try { I(); }
  catch (err) {
    console.error(err);
    const loader = document.getElementById("loader");
    const fallback = document.getElementById("fallback");
    if (loader) loader.classList.add("is-hidden");
    if (fallback) fallback.hidden = false;
  }
})();
  