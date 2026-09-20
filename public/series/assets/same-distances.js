import { LABELS, EDGES, TARGET, INITIAL_ANGLES, BEST_PROPER_RMS, rotationMatrix, transform, placedSource, edgeLengths, rmsDistance, signedVolume, bestProperFit } from './same-distances-model.js';

const $ = id => document.getElementById(id);
const sliderIds = ['rotateX', 'rotateY', 'rotateZ'];
const camera = rotationMatrix([23, -30, 0]);
const fixedScale = 65;
let angles = [...INITIAL_ANGLES];
let reflectionAllowed = false;
let pointer = null;

const fmt = value => value.toFixed(3);
const signed = value => `${value < 0 ? '−' : '+'}${fmt(Math.abs(value))}`;
const wrapAngle = value => ((Math.round(value) + 180) % 360 + 360) % 360 - 180;
const project = point => { const view = transform(camera, point); return [310 + fixedScale * view[0], 220 - fixedScale * view[1], view[2]]; };
const xy = point => `${point[0].toFixed(3)} ${point[1].toFixed(3)}`;

function fieldSVG(source, rms) {
  const target2 = TARGET.map(project), source2 = source.map(project);
  let svg = `<svg viewBox="80 0 460 460" role="img" aria-labelledby="fieldTitle fieldDescription"><title id="fieldTitle">Labeled target and moving tetrahedron</title><desc id="fieldDescription">The current three-dimensional RMS mismatch is ${fmt(rms)} units. Target vertices are open circles with dashed edges; moving vertices are filled diamonds with solid edges. Both centers coincide. The ${reflectionAllowed ? 'reflected' : 'original mirrored'} moving body has signed volume ${signed(signedVolume(source))} cubic units.</desc>`;
  const center = project([0, 0, 0]);
  svg += `<path class="field-center" d="M${center[0] - 6} ${center[1]}h12 M${center[0]} ${center[1] - 6}v12"/>`;
  for (let i = 0; i < 4; i++) svg += `<path class="tetra-connector" d="M${xy(target2[i])}L${xy(source2[i])}"/>`;
  for (const [a, b] of EDGES) svg += `<path class="tetra-edge tetra-target" d="M${xy(target2[a])}L${xy(target2[b])}"/>`;
  for (const [a, b] of EDGES) svg += `<path class="tetra-edge" d="M${xy(source2[a])}L${xy(source2[b])}"/>`;
  for (let i = 0; i < 4; i++) {
    const [tx, ty] = target2[i], [sx, sy] = source2[i];
    svg += `<circle class="target-point" cx="${tx}" cy="${ty}" r="8"/><text class="tetra-label tetra-target-label" x="${tx - 13}" y="${ty - 13}" text-anchor="end">${LABELS[i]}</text>`;
    svg += `<path class="source-point" d="M${sx} ${sy - 6}l6 6 -6 6 -6 -6Z"/>`;
    // Once exactly aligned, one label per corresponding pair is enough.
    if (rms > 1e-9) svg += `<text class="tetra-label" x="${sx + 13}" y="${sy + 23}">${LABELS[i]}</text>`;
  }
  // A one-unit screen-plane scale, unchanged by all controls.
  svg += `<path class="field-scale" d="M112 426v8 m0 -4h65 m0 -4v8"/><text class="field-note" x="112" y="453">1 unit · screen plane</text>`;
  const axisOrigin = [486, 404];
  for (let j = 0; j < 3; j++) {
    const axis = [0, 0, 0]; axis[j] = 1;
    const d = transform(camera, axis);
    const end = [axisOrigin[0] + 36 * d[0], axisOrigin[1] - 36 * d[1]];
    svg += `<path class="field-axis" d="M${xy(axisOrigin)}L${xy(end)}"/><text class="field-axis-label" x="${end[0] + (d[0] > 0 ? 6 : -6)}" y="${end[1] + (d[1] > .3 ? -6 : 14)}" text-anchor="middle">${'xyz'[j]}</text>`;
  }
  return svg + '</svg>';
}

function draw() {
  const source = placedSource(angles, reflectionAllowed);
  const rms = rmsDistance(source, TARGET);
  $('fieldPlot').innerHTML = fieldSVG(source, rms);
  $('currentRms').value = fmt(rms);
  $('bestRms').textContent = `${fmt(BEST_PROPER_RMS)} units`;
  $('targetVolume').textContent = signed(signedVolume(TARGET));
  $('sourceVolume').textContent = signed(signedVolume(source));
  const atBest = !reflectionAllowed && Math.abs(rms - BEST_PROPER_RMS) < 1e-10;
  $('reset').setAttribute('aria-pressed', String(!reflectionAllowed && !atBest));
  $('distanceCaseNumber').textContent = `${reflectionAllowed ? '03' : atBest ? '02' : '01'} / Three operations`;
  $('distanceCaseTitle').textContent = reflectionAllowed ? 'Reflection allowed' : atBest ? 'Best proper fit' : 'Mirror';
  $('distanceCaseDescription').textContent = reflectionAllowed
    ? 'One reflection changes the hand. The same six distances now permit an exact fit.'
    : atBest ? 'Even the globally best proper rotation leaves a gap. Distance alone did not name the hand.'
    : 'Six matching edges. Opposite hands. Drag the body and try to close the gap.';
  $('reflect').setAttribute('aria-pressed', String(reflectionAllowed));
  $('bestFit').setAttribute('aria-pressed', String(!reflectionAllowed && Math.abs(rms - BEST_PROPER_RMS) < 1e-10));
  $('fitState').textContent = rms < 1e-9 ? 'Every label coincides. Reflection changed the hand.'
    : !reflectionAllowed && Math.abs(rms - BEST_PROPER_RMS) < 1e-10 ? 'The closest proper rotation still leaves this gap.'
    : reflectionAllowed ? 'Reflection is allowed; return to zero rotation to align.' : 'This is your current attempt, measured in full 3D.';
  $('reflectionState').textContent = reflectionAllowed
    ? 'Reflection is allowed. The original mirror has been reflected again; its volume sign now matches the target.'
    : 'Reflection is excluded. Moving and target have opposite signed volumes.';
  const targetLengths = edgeLengths(TARGET), currentLengths = edgeLengths(source);
  $('distanceRows').innerHTML = EDGES.map(([a, b], i) => `<tr><th scope="row">${LABELS[a]}${LABELS[b]}</th><td>${fmt(targetLengths[i])}</td><td>${fmt(currentLengths[i])}</td></tr>`).join('');
  const error = Math.max(...targetLengths.map((length, i) => Math.abs(length - currentLengths[i])));
  $('distanceAudit').textContent = error < 1e-12 ? '6 / 6 distances agree · mismatch < 10⁻¹² units' : `Largest edge mismatch: ${error.toExponential(2)} units`;
  sliderIds.forEach((id, i) => { $(id).value = String(angles[i]); $(`${id}Out`).value = `${angles[i]}°`; });
}

function announce(message) { $('announcement').textContent = message; }
function announceAttempt() { announce(`Current three-dimensional RMS ${fmt(rmsDistance(placedSource(angles, reflectionAllowed), TARGET))} units. ${reflectionAllowed ? 'Reflection allowed.' : 'Rotation-only minimum 1 unit.'}`); }

sliderIds.forEach((id, i) => {
  $(id).addEventListener('input', event => { angles[i] = Number(event.target.value); draw(); });
  $(id).addEventListener('change', announceAttempt);
});
$('bestFit').addEventListener('click', () => {
  reflectionAllowed = false;
  angles = bestProperFit().angles;
  draw();
  announce('Best proper rotation reached. Three-dimensional RMS 1 unit. No rotation or translation can reduce it further for this labeled mirror pair.');
});
$('reflect').addEventListener('click', () => {
  reflectionAllowed = true;
  angles = [0, 0, 0];
  draw();
  announce('Reflection allowed. Corresponding labels align exactly, RMS zero. The signed volumes now match.');
});
$('reset').addEventListener('click', () => { angles = [...INITIAL_ANGLES]; reflectionAllowed = false; draw(); announce('Opening orientation restored. Reflection excluded.'); });

const field = $('orientationField');
field.addEventListener('pointerdown', event => {
  if (event.button !== 0 || pointer) return;
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, angles: [...angles] };
  field.setPointerCapture(event.pointerId);
  field.classList.add('dragging');
  field.focus({ preventScroll: true });
});
field.addEventListener('pointermove', event => {
  if (!pointer || event.pointerId !== pointer.id) return;
  angles[0] = wrapAngle(pointer.angles[0] + (event.clientY - pointer.y) * .55);
  angles[1] = wrapAngle(pointer.angles[1] + (event.clientX - pointer.x) * .55);
  draw();
});
function releasePointer(event) {
  if (!pointer || (event?.pointerId !== undefined && event.pointerId !== pointer.id)) return;
  const id = pointer.id;
  pointer = null;
  field.classList.remove('dragging');
  if (field.hasPointerCapture(id)) field.releasePointerCapture(id);
  if (event?.type === 'pointerup') announceAttempt();
}
field.addEventListener('pointerup', releasePointer);
field.addEventListener('pointercancel', releasePointer);
field.addEventListener('lostpointercapture', releasePointer);
document.addEventListener('visibilitychange', () => { if (document.hidden) releasePointer(); });
window.addEventListener('pagehide', () => releasePointer());
field.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
  const directions = { ArrowUp: [0, -5], ArrowDown: [0, 5], ArrowLeft: [1, -5], ArrowRight: [1, 5], '[': [2, -5], ']': [2, 5] };
  const action = directions[event.key];
  if (!action) return;
  event.preventDefault();
  angles[action[0]] = wrapAngle(angles[action[0]] + action[1]);
  draw(); announceAttempt();
});

function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'paper' ? 'UV' : 'Paper';
  $('theme').setAttribute('aria-label', `Switch to ${value === 'paper' ? 'UV' : 'Paper'} presentation`);
  try { localStorage.setItem('same-reading-theme', value); } catch { /* Storage is optional. */ }
}
let saved = 'uv';
try { saved = localStorage.getItem('same-reading-theme') || 'uv'; } catch { /* Storage is optional. */ }
theme(saved === 'paper' ? 'paper' : 'uv');
$('theme').addEventListener('click', () => theme(document.documentElement.dataset.theme === 'paper' ? 'uv' : 'paper'));
draw();
