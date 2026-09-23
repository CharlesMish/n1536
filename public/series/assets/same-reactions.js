import { specimen, PAIR_DEFAULT } from './same-reactions-model.js';

const $ = id => document.getElementById(id);
const buttons = [...document.querySelectorAll('[data-case]')];
const x = u => 72 + 740 * u;
const round = number => Number(number.toFixed(2));
const fmt = number => number.toFixed(5);
let kind = 'pair';
let pairPosition = PAIR_DEFAULT;

const pointPath = (model, value, scale, samples = 100) => Array.from({ length: samples + 1 }, (_, i) => {
  const u = i / samples;
  return `${i ? 'L' : 'M'} ${round(x(u))} ${round(scale(value.call(model, u)))}`;
}).join(' ');

function loadSVG(model) {
  const arrows = model.pointLoads.length === 2 && model.pointLoads[0].u === model.pointLoads[1].u ?
    [{ u: 0.5, share: 1 }] : model.pointLoads;
  const loads = model.uniformRate ? `
    <path class="load-band" d="M72 29H812V46H72Z"/>
    ${Array.from({ length: 17 }, (_, i) => `<path class="load-arrow" d="M${round(x(i / 16))} 46V88"/>`).join('')}
    <text class="load-note" x="442" y="20" text-anchor="middle">q = W / L · across the whole span</text>` :
    arrows.map((load, i) => `<path class="load-arrow" d="M${round(x(load.u))} 24V88"/><text class="load-note" x="${round(x(load.u) + (arrows.length === 2 ? (i ? 14 : -14) : 14))}" y="24" text-anchor="${arrows.length === 2 && !i ? 'end' : 'start'}">${load.share === 1 ? 'W' : 'W/2'}</text>`).join('');
  const label = model.kind === 'pair' ? `Two W/2 loads at ${pairPosition.toFixed(2)}L and ${(1 - pairPosition).toFixed(2)}L.` :
    model.kind === 'center' ? 'One load W at midspan.' : 'A uniform load W/L along the beam.';
  return `<svg viewBox="0 0 860 195" role="img" aria-labelledby="loadTitle loadDesc">
    <title id="loadTitle">Applied load and identical reactions</title>
    <desc id="loadDesc">${label} The left and right support reactions are both W/2.</desc>
    <defs><marker id="arrowDown" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="marker-load" d="M1 1 7 4 1 7Z"/></marker><marker id="arrowUp" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="marker-reaction" d="M1 1 7 4 1 7Z"/></marker></defs>
    <path class="beam" d="M72 100H812"/>${loads}
    <path class="support" d="M72 106 59 126H85Z M812 106 799 126H825Z"/><circle class="support" cx="805" cy="130" r="3"/><circle class="support" cx="819" cy="130" r="3"/><path class="support-ground" d="M55 129H89 M795 135H829"/>
    <path class="reaction-arrow" d="M72 175V142"/><path class="reaction-arrow" d="M812 175V148"/>
    <text class="reaction-note" x="90" y="173">Rₐ = W/2</text><text class="reaction-note" x="794" y="173" text-anchor="end">Rᵦ = W/2</text>
    <text class="axis-note" x="72" y="192">0</text><text class="axis-note" x="812" y="192" text-anchor="end">L</text>
  </svg>`;
}

function axes(plotKind) {
  const isMoment = plotKind === 'moment';
  const baseline = isMoment ? 148 : 42;
  const scale = isMoment ? value => baseline - 100 * value / 0.25 : value => baseline + 106 * value / (1 / 48);
  const ticks = isMoment ? [[0, '0'], [1 / 8, '1/8'], [1 / 4, '1/4']] : [[0, '0'], [1 / 96, '1/96'], [1 / 48, '1/48']];
  const grid = ticks.map(([value, label]) => `<path class="grid-line" d="M72 ${round(scale(value))}H812"/><text class="tick" x="58" y="${round(scale(value) + 4)}" text-anchor="end">${label}</text>`).join('');
  const mid = `<path class="midline" d="M442 28V158"/><text class="tick" x="72" y="174" text-anchor="middle">0</text><text class="tick" x="442" y="174" text-anchor="middle">L/2</text><text class="tick" x="812" y="174" text-anchor="middle">L</text>`;
  return { baseline, scale, grid, mid };
}

function curveSVG(model, plotKind) {
  const isMoment = plotKind === 'moment';
  const { baseline, scale, grid, mid } = axes(plotKind);
  const value = isMoment ? model.moment : model.displacement;
  const reference = specimen('uniform');
  const referenceValue = isMoment ? reference.moment : reference.displacement;
  const selected = pointPath(model, value, scale);
  const uniform = pointPath(reference, referenceValue, scale);
  const peak = isMoment ? model.peakMoment : model.midspanDisplacement;
  const pointY = scale(peak);
  const ref = model.kind === 'uniform' ? '' : `<path class="reference-curve" d="${uniform}"/>`;
  const axisName = isMoment ? 'Bending moment' : 'Downward deflection';
  const alt = isMoment ? `Selected peak M/(WL) is ${fmt(peak)}.${model.kind === 'uniform' ? '' : ' The dashed uniform peak is 0.12500.'}` :
    `Selected midspan displacement divided by WL cubed over EI is ${fmt(peak)}.${model.kind === 'uniform' ? '' : ` The dashed uniform value is ${(5 / 384).toFixed(5)}.`}`;
  return `<svg viewBox="0 0 860 182" role="img" aria-labelledby="${plotKind}Title ${plotKind}Desc">
    <title id="${plotKind}Title">${axisName} on a fixed scale</title><desc id="${plotKind}Desc">${alt} Horizontal position is x/L from zero to one.</desc>
    ${grid}${mid}<path class="axis-line" d="M72 ${baseline}H812"/>
    <path class="selected-fill" d="${selected} L812 ${baseline} L72 ${baseline}Z"/>
    ${ref}<path class="selected-curve" d="${selected}"/><circle class="selected-point" cx="442" cy="${round(pointY)}" r="5"/>
  </svg>`;
}

function describe(model) {
  if (kind === 'center') return {
    index: '01 / CENTER POINT', name: 'One concentrated load',
    reading: 'Both supports still read W/2. The force enters at the middle, where the peak moment reaches WL/4; this gives the largest midspan deflection, also reached when the paired loads coincide.',
    peak: '1/4', displacement: '1/48',
  };
  if (kind === 'uniform') return {
    index: '03 / UNIFORM', name: 'Spread across the span',
    reading: 'Both supports still read W/2. This smooth moment curve peaks at WL/8, matching the quarter pair’s peak, while its midspan deflection is smaller.',
    peak: '1/8', displacement: '5/384',
  };
  if (Math.abs(pairPosition - 0.25) < 1e-10) return {
    index: '02 / TWO POINT LOADS', name: 'The quarter pair',
    reading: 'Two equal loads at L/4 and 3L/4 make the same peak moment as a uniform load. Their moment profiles differ; the pair’s midspan deflection is 10% larger.',
    peak: '1/8', displacement: '11/768',
  };
  return {
    index: '02 / SYMMETRIC PAIR', name: `Two loads at ${pairPosition.toFixed(2)} L`,
    reading: pairPosition === 0.5 ? 'The two half-loads now coincide at the center. Their curve matches the single centered load; both support reactions remain W/2.' :
      'Move the two half-loads together or apart. Their resultant and both reactions stay fixed while the interior moment and displacement change.',
    peak: fmt(model.peakMoment), displacement: fmt(model.midspanDisplacement),
  };
}

function draw() {
  const model = specimen(kind, pairPosition);
  $('loadPlot').innerHTML = loadSVG(model);
  $('momentPlot').innerHTML = curveSVG(model, 'moment');
  $('deflectionPlot').innerHTML = curveSVG(model, 'deflection');
  const description = describe(model);
  $('caseNumber').textContent = description.index;
  $('caseName').textContent = description.name;
  $('caseReading').textContent = description.reading;
  $('peakMoment').textContent = description.peak;
  $('midDeflection').textContent = description.displacement;
  $('pairTool').hidden = kind !== 'pair';
  $('referenceLegend').hidden = kind === 'uniform';
  document.querySelectorAll('.numeric-precision').forEach(node => { node.hidden = kind !== 'pair' || Math.abs(pairPosition - 0.25) < 1e-10; });
  $('pairPosition').setAttribute('aria-valuetext', `${pairPosition.toFixed(2)} L from each support`);
  $('pairOutput').value = pairPosition.toFixed(2);
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === kind)));
  $('staticPreview').hidden = true;
  $('interactive').hidden = false;
}

function announce() {
  $('announcement').textContent = `${$('caseName').textContent}. Reactions W over 2 on both supports. Peak normalized moment ${$('peakMoment').textContent}. Midspan normalized deflection ${$('midDeflection').textContent}.`;
}

buttons.forEach(button => button.addEventListener('click', () => {
  kind = button.dataset.case;
  draw();
  announce();
}));
$('pairPosition').addEventListener('input', event => {
  kind = 'pair';
  pairPosition = Number(event.target.value);
  draw();
});
$('pairPosition').addEventListener('change', announce);

function theme(value) {
  const selected = value === 'paper' ? 'paper' : 'uv';
  document.documentElement.dataset.theme = selected;
  $('theme').textContent = selected === 'paper' ? 'UV' : 'Paper';
  $('theme').setAttribute('aria-label', `Switch to ${selected === 'paper' ? 'UV' : 'Paper'} presentation`);
  try { localStorage.setItem('same-reading-theme', selected); } catch { /* Optional storage. */ }
}
let savedTheme;
try { savedTheme = localStorage.getItem('same-reading-theme'); } catch { /* Optional storage. */ }
theme(savedTheme);
$('theme').addEventListener('click', () => theme(document.documentElement.dataset.theme === 'paper' ? 'uv' : 'paper'));

const notes = $('study-notes');
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  const target = event.target;
  if (!(target instanceof Element) || target.closest('input, select, textarea, [contenteditable], svg, [role="img"], dialog')) return;
  if (notes.open && notes.contains(target)) return;
  const rail = document.querySelector('.exhibit-switcher');
  if (/^[1-3]$/.test(event.key)) {
    event.preventDefault(); buttons[Number(event.key) - 1].click(); return;
  }
  if (!rail.contains(target) || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const current = Math.max(0, buttons.indexOf(target.closest('button')));
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
    (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  event.preventDefault(); buttons[next].focus(); buttons[next].click();
});

draw();
