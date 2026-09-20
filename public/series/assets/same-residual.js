import { DEFAULT_ANGLE, stateAt } from './same-residual-model.js';

const $ = id => document.getElementById(id);
const fmt = (value, places = 6) => (Math.abs(value) < 0.5 * 10 ** -places ? 0 : value).toFixed(places).replace('-', '−');
const pair = values => `(${values.map(value => fmt(value)).join(', ')})`;
let angle = DEFAULT_ANGLE;
let state = stateAt(angle);
let pointer = null;

function draw() {
  state = stateAt(angle);
  const preset = state.angle === 0 ? 0 : state.angle === 45 ? 1 : state.angle === 90 ? 2 : -1;
  $('residualCaseNumber').textContent = preset >= 0 ? `0${preset + 1} / Three directions` : 'Custom direction';
  $('residualCaseTitle').textContent = ['First axis', 'Diagonal', 'Second axis'][preset] || `${Math.round(angle)}° direction`;
  $('residualCaseDescription').textContent = [
    'A unit miss along the first axis becomes an error of just 0.01. The bound is far from attained.',
    'The same unit miss is shared between the two directions. Only the first component shrinks.',
    'A unit miss along the second axis passes through unchanged. This direction attains the bound.'
  ][preset] || 'The residual keeps its length while the error follows the narrow ellipse. The condition-number bound stays fixed.';

  $('angle').value = String(angle);
  $('angleOut').value = `${Math.round(angle)}°`;
  $('angle').setAttribute('aria-valuetext', `${Math.round(angle)} degrees`);
  for (const name of ['residual', 'error']) {
    const [vx, vy] = state[name];
    const x = 180 + 124 * vx, y = 180 - 124 * vy;
    $(`${name}Vector`).setAttribute('d', `M180 180L${x} ${y}`);
    if (name === 'residual') {
      $('residualPoint').setAttribute('cx', String(x));
      $('residualPoint').setAttribute('cy', String(y));
    } else $('errorPoint').setAttribute('d', `M${x} ${y - 6}l6 6-6 6-6-6Z`);
    $(`${name}Value`).textContent = pair(state[name]);
  }
  $('residualDesc').textContent = `At ${Math.round(angle)} degrees, the residual is ${pair(state.residual)} and its norm is ${fmt(state.residualNorm)}. Both axes use the same fixed scale. Use the direction slider to change the residual direction.`;
  $('errorDesc').textContent = `The error is ${pair(state.error)} and its norm is ${fmt(state.errorNorm)}. The ellipse has horizontal semiaxis 0.01 and vertical semiaxis 1. Both axes use the same fixed scale.`;
  $('approxValue').textContent = pair(state.approximate);
  $('residualNorm').textContent = fmt(state.residualNorm);
  $('errorNorm').textContent = fmt(state.errorNorm);
  $('relativeResidual').textContent = `${fmt(state.relativeResidual * 100, 3)}%`;
  $('relativeError').textContent = `${fmt(state.relativeError * 100, 3)}%`;
  $('amplification').textContent = `${fmt(state.amplification, 3)}×`;
  $('errorBound').textContent = `${fmt(state.relativeErrorBound * 100, 3)}%`;
  $('currentReading').textContent = `At ${Math.round(angle)}°, the relative residual is 1% and the relative solution error is ${fmt(state.relativeError * 100, 3)}%. The condition-number bound remains 100%.`;
  document.querySelectorAll('[data-angle]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.angle) === state.angle)));
}

function announce() {
  $('announcement').textContent = `Direction ${Math.round(angle)} degrees. Relative residual 1 percent. Relative error ${fmt(state.relativeError * 100, 3)} percent. Relative amplification ${fmt(state.amplification, 3)}. Condition-number bound 100 percent.`;
}
function setAngle(value) { angle = value; draw(); }
$('angle').addEventListener('input', event => setAngle(Number(event.target.value)));
$('angle').addEventListener('change', announce);
document.querySelectorAll('[data-angle]').forEach(button => button.addEventListener('click', () => {
  setAngle(Number(button.dataset.angle)); announce();
}));

const surface = $('residualPlot');
function directionFromPointer(event) {
  // SVG's inverse screen transform also handles letterboxing from max-height.
  const transform = surface.getScreenCTM();
  if (!transform) return;
  const point = surface.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
  const local = point.matrixTransform(transform.inverse());
  const dx = local.x - 180, dy = 180 - local.y;
  if (Math.hypot(dx, dy) < 8) return; // Direction is undefined at the origin.
  setAngle((Math.round(Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360);
}
surface.addEventListener('pointerdown', event => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  pointer = event.pointerId;
  surface.setPointerCapture(pointer);
  directionFromPointer(event);
});
surface.addEventListener('pointermove', event => { if (event.pointerId === pointer) directionFromPointer(event); });
function stopPointer(event) {
  if (pointer === null || event.pointerId !== pointer) return;
  if (surface.hasPointerCapture(pointer)) surface.releasePointerCapture(pointer);
  pointer = null;
  announce();
}
surface.addEventListener('pointerup', stopPointer);
surface.addEventListener('pointercancel', stopPointer);
surface.addEventListener('lostpointercapture', () => { pointer = null; });

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
