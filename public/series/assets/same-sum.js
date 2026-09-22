import * as M from './same-sum-model.js';

const $ = id => document.getElementById(id);
const SVG = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  parent?.appendChild(node);
  return node;
};
const int = n => n.toLocaleString('en-US');
const minus = text => text.replace(/^-/, '−');
const grid = units => `${units > 0n ? '+' : units < 0n ? '−' : ''}${int(Number(units < 0n ? -units : units))} × 2⁻²⁰`;
const places = (x, digits) => minus(x.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }));
const compact = x => minus(Math.abs(x) >= 1e6 ? x.toLocaleString('en-US', { maximumFractionDigits: 3 }) : x.toLocaleString('en-US', { maximumFractionDigits: 6 }));
const sup = n => String(n).replace(/-/g, '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

const runs = M.ORDER_NAMES.map(M.runOrder);
const checks = M.verify(runs);
const allPass = checks.every(check => check.pass);
const CASES = [
  { number: '01', kicker: 'Stored order', title: 'Given' },
  { number: '02', kicker: 'Smallest |x| first', title: 'Ascending' },
  { number: '03', kicker: 'Largest |x| first', title: 'Descending' },
];

const stage = document.querySelector('.exhibit-stage');
let active = 0;
let step = 768;
let playing = false;
let frame = 0;
let lastTime = 0;

/* ---------- bit panel ---------- */
const WIDTH = 63;                 // bit positions 0 (2^-20) … 62 (2^42)
const X0 = 88, CELL = 9.6;
const colX = p => X0 + (WIDTH - 1 - p) * CELL;
const narrow = typeof matchMedia === 'function' ? matchMedia('(max-width: 620px)') : { matches: false, addEventListener() {} };
const LAYOUTS = {
  wide: { height: 222, row: 17, ys: [40, 66, 108, 134, 184], tray: 166, driftHeight: 176, py1: 146 },
  narrow: { height: 300, row: 27, ys: [44, 84, 138, 176, 256], tray: 226, driftHeight: 300, py1: 250 },
};
const ROWS = [
  { key: 'a', label: 'accumulator', short: 'acc' },
  { key: 'b', label: '+ value', short: '+ x' },
  { key: 'x', label: 'exact sum', short: 'exact' },
  { key: 's', label: 'stored', short: 'stored' },
  { key: 'e', label: 'correction', short: 'corr.' },
];
const bits = $('bitsPlot');
const bitCells = {};
const signs = {};
let windowGroup;
let layout = LAYOUTS.wide;

function buildBits() {
  layout = narrow.matches ? LAYOUTS.narrow : LAYOUTS.wide;
  const keep = [...bits.children].filter(node => node.tagName === 'title' || node.tagName === 'desc');
  bits.replaceChildren(...keep);
  bits.setAttribute('viewBox', `0 0 700 ${layout.height}`);
  const { row: ROW, ys } = layout;
  const ruler = el('g', { class: 'ruler' }, bits);
  for (let p = 0; p <= 60; p += 10) {
    const x = colX(p) + CELL / 2;
    el('path', { d: `M${x} 22V${layout.height - 20}`, class: 'ruler-line' }, ruler);
    const label = el('text', { x, y: 14, 'text-anchor': 'middle' }, ruler);
    label.textContent = `2${sup(p - M.GRID_BITS)}`;
  }
  windowGroup = el('g', { class: 'window' }, bits);
  const top = ys[2] - 6, height = ys[3] + ROW + 6 - top;
  el('rect', { class: 'shed-zone', id: 'shedZone', y: top, height }, windowGroup);
  el('rect', { class: 'window-frame', id: 'windowFrame', y: top, height }, windowGroup);
  el('text', { class: 'window-label', id: 'windowLabel', y: top - 5 }, windowGroup);
  el('path', { d: `M${X0 - 4} ${layout.tray}H${colX(0) + CELL + 4}`, class: 'tray-line' }, bits);
  ROWS.forEach((row, i) => {
    const y = ys[i], mid = y + ROW / 2;
    const label = el('text', { x: X0 - 22, y: mid, 'dominant-baseline': 'central', 'text-anchor': 'end', class: 'row-label' }, bits);
    label.textContent = narrow.matches ? row.short : row.label;
    signs[row.key] = el('text', { x: X0 - 8, y: mid, 'dominant-baseline': 'central', 'text-anchor': 'middle', class: 'row-sign' }, bits);
    bitCells[row.key] = Array.from({ length: WIDTH }, (_, p) =>
      el('rect', { x: colX(p) + 1, y, width: CELL - 2, height: ROW, class: 'bit' }, bits));
  });
}
buildBits();

function paintRow(key, units, floor, kind) {
  const b = M.unitBits(units, WIDTH);
  signs[key].textContent = units < 0n ? '−' : units > 0n ? '+' : '';
  // Positions above the most significant set bit are drawn as empty cells.
  bitCells[key].forEach((cell, p) => {
    let cls = b[p] ? 'bit on' : 'bit';
    if (b[p] && kind === 'exact' && floor !== null && p < floor) cls = 'bit on lost';
    if (b[p] && kind === 'stored') cls = 'bit on kept';
    if (b[p] && kind === 'error') cls = 'bit on lost';
    cell.setAttribute('class', cls);
  });
}

function drawBits() {
  const run = runs[active];
  if (step === 0) {
    for (const row of ROWS) paintRow(row.key, 0n, null, 'plain');
    windowGroup.setAttribute('visibility', 'hidden');
    $('stepLine').textContent = 'Step 0 · the accumulator is empty. Play or scrub to add values.';
    $('bitsDesc').textContent = 'Step 0. Nothing has been added yet.';
    return;
  }
  const index = run.order[step - 1];
  const a = M.toUnits(run.acc[step - 1]);
  const b = M.toUnits(M.VALUES[index]);
  const x = a + b;
  const s = M.toUnits(run.acc[step]);
  const e = x - s;
  const floor = M.windowFloor(run.acc[step]);
  paintRow('a', a, null, 'plain');
  paintRow('b', b, null, 'plain');
  paintRow('x', x, floor, 'exact');
  paintRow('s', s, floor, 'stored');
  paintRow('e', e, null, 'error');

  if (floor === null) windowGroup.setAttribute('visibility', 'hidden');
  else {
    windowGroup.setAttribute('visibility', 'visible');
    const top = Math.min(WIDTH - 1, floor + 52);
    const low = Math.max(0, floor);
    const left = colX(top), right = colX(low) + CELL;
    $('windowFrame').setAttribute('x', left);
    $('windowFrame').setAttribute('width', right - left);
    $('windowFrame').setAttribute('class', floor < 0 ? 'window-frame open' : 'window-frame');
    const zone = $('shedZone');
    if (floor > 0) { zone.setAttribute('x', right); zone.setAttribute('width', colX(0) + CELL - right); zone.setAttribute('visibility', 'visible'); }
    else zone.setAttribute('visibility', 'hidden');
    const label = $('windowLabel');
    const rightAligned = left > 330;
    label.setAttribute('x', rightAligned ? right : left);
    label.setAttribute('text-anchor', rightAligned ? 'end' : 'start');
    label.textContent = narrow.matches
      ? (floor < 0 ? '53 bits · all kept' : `53 bits · floor 2${sup(floor - M.GRID_BITS)}`)
      : floor < 0
        ? '53-bit window · reaches below 2⁻²⁰, nothing can round'
        : `53-bit window · lowest kept bit 2${sup(floor - M.GRID_BITS)}`;
  }
  const correction = e === 0n ? 'exact addition · correction 0' : `correction ${grid(e)} · rounded ${e < 0n ? 'upward' : 'downward'}`;
  $('stepLine').textContent = `Step ${int(step)} · added stored value ${int(index + 1)}, ${compact(M.VALUES[index])} · ${correction}`;
  $('bitsDesc').textContent = `Step ${step}. The accumulator held ${compact(run.acc[step - 1])}; the value added was ${compact(M.VALUES[index])}. ` +
    (floor === null ? 'The stored result is zero.' : `The stored result keeps bits down to 2 to the power ${floor - M.GRID_BITS}. `) +
    (e === 0n ? 'The addition is exact.' : `Rounding correction, exact minus stored: ${grid(e)}. The stored result rounded ${e < 0n ? 'upward' : 'downward'}.`);
}

/* ---------- drift panel ---------- */
const drift = $('driftPlot');
const PX0 = X0, PX1 = colX(0) + CELL, PY0 = 16;
const LIMIT = 0.0021;
const sx = k => PX0 + (PX1 - PX0) * k / M.N;
let sy, driftBand, traces, cursor, cursorDot;

function buildDrift() {
  const PY1 = layout.py1;
  sy = v => (PY0 + PY1) / 2 - (PY1 - PY0) / 2 * v / LIMIT;
  const keep = [...drift.children].filter(node => node.tagName === 'title' || node.tagName === 'desc');
  drift.replaceChildren(...keep);
  drift.setAttribute('viewBox', `0 0 700 ${layout.driftHeight}`);
  driftBand = el('rect', { class: 'held-band', y: PY0, height: PY1 - PY0 }, drift);
  const axes = el('g', { class: 'drift-axes' }, drift);
  for (const v of [-0.002, -0.001, 0, 0.001, 0.002]) {
    el('path', { d: `M${PX0} ${sy(v)}H${PX1}`, class: v === 0 ? 'zero-line' : 'grid-line' }, axes);
    const t = el('text', { x: PX0 - 8, y: sy(v), 'dominant-baseline': 'central', 'text-anchor': 'end' }, axes);
    t.textContent = v === 0 ? '0' : minus(`${v > 0 ? '+' : ''}${v}`);
  }
  for (const k of [0, 384, 768, 1152, 1536]) {
    el('path', { d: `M${sx(k)} ${PY1}v5`, class: 'tick-line' }, axes);
    const t = el('text', { x: sx(k), y: PY1 + (narrow.matches ? 26 : 17), 'text-anchor': 'middle' }, axes);
    t.textContent = int(k);
  }
  const unit = el('text', { x: PX1, y: PY1 + (narrow.matches ? 46 : 30), 'text-anchor': 'end', class: 'axis-title' }, axes);
  unit.textContent = 'addition step';
  traces = runs.map((run, i) => {
    let d = `M${sx(0)} ${sy(0)}`;
    for (let k = 1; k <= M.N; k += 1) d += `H${sx(k).toFixed(2)}V${sy(run.drift[k]).toFixed(2)}`;
    return el('path', { d, class: `trace trace-${i}` }, drift);
  });
  cursor = el('path', { class: 'cursor-line' }, drift);
  cursorDot = el('circle', { r: narrow.matches ? 7 : 4, class: 'cursor-dot' }, drift);
}
buildDrift();

function drawDrift() {
  const run = runs[active];
  traces.forEach((path, i) => {
    path.setAttribute('class', `trace trace-${i}${i === active ? ' selected' : ''}`);
    if (i === active) drift.appendChild(path);
  });
  drift.appendChild(cursor); drift.appendChild(cursorDot);
  const inX = sx(run.largeInStep), outX = sx(run.largeOutStep);
  driftBand.setAttribute('x', inX);
  driftBand.setAttribute('width', Math.max(1.5, outX - inX));
  cursor.setAttribute('d', `M${sx(step)} ${PY0}V${layout.py1}`);
  cursorDot.setAttribute('cx', sx(step));
  cursorDot.setAttribute('cy', sy(run.drift[step]));
  cursorDot.setAttribute('class', `cursor-dot trace-${active}`);
  const d = run.drift[step];
  $('driftDesc').textContent = `${CASES[active].title}. At step ${step}, computed minus exact running total is ${d === 0 ? 'zero' : places(d, 9)}. ` +
    `The large value is in the accumulator from step ${run.largeInStep} until step ${run.largeOutStep}. Final difference ${grid(run.errorUnits)}.`;
}

/* ---------- reading ---------- */
function held(run) { return run.largeOutStep - run.largeInStep; }
function caseText(i) {
  const run = runs[i];
  if (i === 0) return `L enters at step ${int(run.largeInStep)} and −L cancels it at step ${int(run.largeOutStep)}. Rounding accumulates while L is held. Removing L is exact, but it cannot undo those errors.`;
  if (i === 1) return `The moderate values go first, and none of those additions round. L arrives at step ${int(run.largeInStep)} with the whole running total in the accumulator. One rounding, and −L cannot undo it.`;
  return 'The large pair comes first and cancels exactly. Every later partial sum fits inside 53 bits, so nothing rounds. Exact for this multiset, not in general.';
}

function drawReading() {
  const run = runs[active];
  $('caseNumber').textContent = `${CASES[active].number} / ${CASES[active].kicker}`;
  $('caseName').textContent = CASES[active].title;
  $('caseReading').textContent = caseText(active);
  $('computedTotal').textContent = places(run.computed, 8);
  $('totalError').textContent = run.errorUnits === 0n ? '0 · exact' : grid(run.errorUnits);
  $('roundedCount').textContent = `${int(run.shedCount)} / ${int(M.N)}`;
  const at = run.drift[step];
  $('currentReading').textContent = `${CASES[active].title}, step ${int(step)}: the running total is ${at === 0 ? 'exact' : `${places(at, 9)} from exact`}. ` +
    `Final total ${M.unitsToDecimal(run.computedUnits)}, ${run.errorUnits === 0n ? 'exactly the true sum' : `${grid(run.errorUnits)} from the true sum`}. ` +
    `The large value was held for ${int(held(run))} addition${held(run) === 1 ? '' : 's'}.`;
  document.querySelectorAll('[data-case]').forEach(button =>
    button.setAttribute('aria-pressed', String(Number(button.dataset.case) === active)));
  const any = run.shedCount > 0;
  $('prevRound').disabled = !any || !findRound(-1);
  $('nextRound').disabled = !any || !findRound(1);
}

function drawAudit() {
  const run = runs[active];
  const rows = [];
  if (step === 0) rows.push(['Step', '0 · empty accumulator']);
  else {
    const index = run.order[step - 1];
    const a = M.toUnits(run.acc[step - 1]), b = M.toUnits(M.VALUES[index]);
    const s = M.toUnits(run.acc[step]);
    const floor = M.windowFloor(run.acc[step]);
    rows.push(
      ['Step · order', `${int(step)} of ${int(M.N)} · ${CASES[active].title}`],
      ['Value added · stored position', `${M.unitsToDecimal(b)} · ${int(index + 1)}`],
      ['Accumulator before', M.unitsToDecimal(a)],
      ['Exact a + b', M.unitsToDecimal(a + b)],
      ['Stored fl(a + b)', M.unitsToDecimal(s)],
      ['Rounding correction · exact − stored', `${M.unitsToDecimal(a + b - s)} = ${grid(a + b - s)}`],
      ['Lowest kept bit', floor === null ? 'stored result is zero' : `2${sup(floor - M.GRID_BITS)}`],
      ['Exact running total', M.unitsToDecimal(run.exactUnits[step])],
    );
  }
  const list = $('stepAudit');
  list.replaceChildren(...rows.map(([term, value]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = value;
    div.append(dt, dd); return div;
  }));
}

function drawTotals() {
  const list = $('totalsTable');
  const rows = [['Exact · fixed', M.unitsToDecimal(M.EXACT_UNITS)], ...runs.map((run, i) =>
    [`${CASES[i].title} · ${grid(run.errorUnits)}`, M.unitsToDecimal(run.computedUnits)])];
  list.replaceChildren(...rows.map(([term, value], i) => {
    const div = document.createElement('div');
    if (i > 0) div.className = `trace-${i - 1}`;
    const dt = document.createElement('dt'); dt.textContent = term;
    const dd = document.createElement('dd'); dd.textContent = value;
    div.append(dt, dd); return div;
  }));
}

function draw() {
  stage.dataset.order = String(active);
  $('step').value = String(step);
  $('stepOut').value = `Step ${int(step)} / ${int(M.N)}`;
  $('step').setAttribute('aria-valuetext', `Step ${step} of ${M.N}`);
  drawBits(); drawDrift(); drawReading(); drawAudit();
}

function announce() {
  const run = runs[active];
  $('announcement').textContent = `${CASES[active].title} order. Step ${step}. Final total ${run.errorUnits === 0n ? 'exact' : `${grid(run.errorUnits)} from exact`}. ${run.shedCount} additions rounded.`;
}

/* ---------- controls ---------- */
function findRound(direction) {
  const shed = runs[active].shed;
  for (let k = step + direction; k >= 1 && k <= M.N; k += direction) if (shed[k] !== 0) return k;
  return 0;
}
function setStep(k) { step = Math.max(0, Math.min(M.N, k)); draw(); }
function setCase(i) { stop(); active = i; draw(); announce(); }

function tick(time) {
  if (!playing) return;
  const elapsed = lastTime ? time - lastTime : 16;
  lastTime = time;
  const next = Math.min(M.N, step + Math.max(1, Math.round(elapsed * 0.14)));
  setStep(next);
  if (next >= M.N) { stop(); announce(); return; }
  frame = requestAnimationFrame(tick);
}
function play() {
  if (step >= M.N) step = 0;
  playing = true; lastTime = 0;
  $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true');
  frame = requestAnimationFrame(tick);
}
function stop() {
  playing = false; cancelAnimationFrame(frame);
  $('play').textContent = 'Play'; $('play').setAttribute('aria-pressed', 'false');
}
$('play').addEventListener('click', () => (playing ? stop() : play()));
$('restart').addEventListener('click', () => { stop(); setStep(0); announce(); });
$('step').addEventListener('input', event => { stop(); setStep(Number(event.target.value)); });
$('step').addEventListener('change', announce);
$('prevRound').addEventListener('click', () => { stop(); const k = findRound(-1); if (k) { setStep(k); announce(); } });
$('nextRound').addEventListener('click', () => { stop(); const k = findRound(1); if (k) { setStep(k); announce(); } });
document.querySelectorAll('[data-case]').forEach(button =>
  button.addEventListener('click', () => setCase(Number(button.dataset.case))));
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

// Click or drag on the drift chart to choose a step.
let pointer = null;
function stepFromPointer(event) {
  const matrix = drift.getScreenCTM();
  if (!matrix) return;
  const point = drift.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
  const local = point.matrixTransform(matrix.inverse());
  stop(); setStep(Math.round((local.x - PX0) / (PX1 - PX0) * M.N));
}
drift.addEventListener('pointerdown', event => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  pointer = event.pointerId; drift.setPointerCapture(pointer); stepFromPointer(event);
});
drift.addEventListener('pointermove', event => { if (event.pointerId === pointer) stepFromPointer(event); });
const release = event => { if (event.pointerId !== pointer) return; pointer = null; announce(); };
drift.addEventListener('pointerup', release);
drift.addEventListener('pointercancel', release);

/* ---------- theme ---------- */
function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'paper' ? 'UV' : 'Paper';
  $('theme').setAttribute('aria-label', `Switch to ${value === 'paper' ? 'UV' : 'Paper'} presentation`);
  try { localStorage.setItem('same-reading-theme', value); } catch { /* Storage is optional. */ }
}
let saved = null;
try { saved = localStorage.getItem('same-reading-theme'); } catch { /* Storage is optional. */ }
const hinted = document.documentElement.dataset.theme;
const prefersPaper = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
const initial = saved || (hinted === 'light' ? 'paper' : hinted === 'dark' ? 'uv' : hinted) || (prefersPaper ? 'paper' : 'uv');
theme(initial === 'paper' ? 'paper' : 'uv');
$('theme').addEventListener('click', () => theme(document.documentElement.dataset.theme === 'paper' ? 'uv' : 'paper'));

narrow.addEventListener('change', () => { buildBits(); buildDrift(); draw(); });

/* ---------- static readouts ---------- */
$('exactTotal').value = M.unitsToDecimal(M.EXACT_UNITS);
runs.forEach((run, i) => { $(`caseSmall${i}`).textContent = run.errorUnits === 0n ? 'exact' : grid(run.errorUnits); });
$('ledgerStatus').textContent = allPass ? `✓ ${checks.length} checks` : '✗ check failed';
$('ledgerStatus').className = allPass ? '' : 'failed';
$('checkList').replaceChildren(...checks.map(check => {
  const li = document.createElement('li');
  li.className = check.pass ? 'pass' : 'fail';
  li.textContent = `${check.pass ? '✓' : '✗'} ${check.label}`;
  return li;
}));
drawTotals();
draw();
