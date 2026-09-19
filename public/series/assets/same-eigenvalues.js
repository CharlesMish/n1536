import { END_TIME, stateAt, normAt, peakForInitial, trajectory } from './same-eigenvalues-model.js';

const $ = id => document.getElementById(id);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const fmt = (value, decimals = 3) => value.toFixed(decimals);
let k = 12;
let time = 0.69;
let samples = trajectory(k);
const reference = trajectory(0);
let peak = peakForInitial(k);
let animation = null;
let previousTime = null;
let lastDraw = 0;

function path(points, to, until = END_TIME) {
  const visible = points.filter(point => point.time <= until);
  if (until < END_TIME && visible.at(-1)?.time !== until) visible.push({ time: until, state: stateAt(k, until), norm: normAt(k, until) });
  return visible.map((point, i) => `${i ? 'L' : 'M'}${to(point).map(value => fmt(value)).join(' ')}`).join(' ');
}

function phaseSVG() {
  // 168 SVG units per state unit on BOTH axes, unchanged across k and time.
  const x = value => 102 + 168 * value;
  const y = value => 254 - 168 * value;
  const to = point => [x(point.state[0]), y(point.state[1])];
  const current = stateAt(k, time);
  let svg = `<svg viewBox="0 0 680 364" role="img" aria-labelledby="phaseTitle phaseDesc"><title id="phaseTitle">State trajectory at coupling ${fmt(k, 1)}</title><desc id="phaseDesc">Fixed equal-unit axes. The selected state at time ${fmt(time, 2)} is (${fmt(current[0])}, ${fmt(current[1])}). The dashed uncoupled reference descends straight from (0, 1) to zero. The dotted quarter-circle marks distance one from zero.</desc>`;
  for (const value of [0, 1, 2, 3]) svg += `<path class="grid-line" d="M${x(value)} 44V296"/><text x="${x(value)}" y="319" text-anchor="middle">${value}</text>`;
  for (const value of [0, 0.5, 1]) svg += `<path class="grid-line" d="M60 ${y(value)}H648"/><text x="47" y="${y(value) + 4}" text-anchor="end">${value}</text>`;
  svg += `<path class="axis-line" d="M60 ${y(0)}H648 M${x(0)} 44V296"/><path class="unit-line" d="M${x(0)} ${y(1)} A168 168 0 0 1 ${x(1)} ${y(0)}"/><text class="plot-label" x="639" y="343" text-anchor="end">x₁ →</text><text class="plot-label" x="61" y="26">x₂ ↑</text>`;
  svg += `<path class="reference-line" d="${path(reference, to)}"/><path class="complete-line" d="${path(samples, to)}"/><path class="elapsed-line" d="${path(samples, to, time)}"/>`;
  svg += `<rect class="start-point" x="${x(0) - 4}" y="${y(1) - 4}" width="8" height="8"/><text class="start-label" x="${x(0) + 13}" y="${y(1) - 11}">start (0, 1)</text><circle class="current-point" cx="${x(current[0])}" cy="${y(current[1])}" r="6"/><text class="plot-label" x="${x(0) + 12}" y="${y(0) + 24}">zero</text>`;
  return svg + '</svg>';
}

function normSVG() {
  // Fixed t=[0,6] and norm=[0,3.5] for every coupling.
  const x = value => 60 + 80 * value;
  const y = value => 294 - 72 * value;
  const to = point => [x(point.time), y(point.norm)];
  let svg = `<svg viewBox="0 0 570 364" role="img" aria-labelledby="normTitle normDesc"><title id="normTitle">Norm through time at coupling ${fmt(k, 1)}</title><desc id="normDesc">The initial norm is one. Its global peak for this start is ${fmt(peak.norm)} at time ${fmt(peak.time)}. The current norm is ${fmt(normAt(k, time))}. Every time axis runs from zero to six and every norm axis from zero to three point five.</desc>`;
  for (const value of [0, 1, 2, 3]) svg += `<path class="grid-line" d="M60 ${y(value)}H540"/><text x="46" y="${y(value) + 4}" text-anchor="end">${value}</text>`;
  for (const value of [0, 1, 2, 3, 4, 5, 6]) svg += `<path class="grid-line" d="M${x(value)} 42V294"/><text x="${x(value)}" y="319" text-anchor="middle">${value}</text>`;
  svg += `<path class="axis-line" d="M60 42V294H540"/><path class="unit-line" d="M60 ${y(1)}H540"/><text class="plot-label" x="61" y="26">‖x‖₂ ↑</text><text class="plot-label" x="539" y="343" text-anchor="end">time t →</text>`;
  svg += `<path class="reference-line" d="${path(reference, to)}"/><path class="complete-line" d="${path(samples, to)}"/><path class="elapsed-line" d="${path(samples, to, time)}"/><path class="time-line" d="M${x(time)} 42V294"/>`;
  svg += `<circle class="peak-point" cx="${x(peak.time)}" cy="${y(peak.norm)}" r="4"/><text class="peak-label" x="${x(peak.time) + 10}" y="${y(peak.norm) - 10}">peak ${fmt(peak.norm)}×</text><circle class="current-point" cx="${x(time)}" cy="${y(normAt(k, time))}" r="6"/>`;
  return svg + '</svg>';
}

function draw() {
  $('phasePlot').innerHTML = phaseSVG();
  $('normPlot').innerHTML = normSVG();
  $('time').value = String(time);
  $('timeOut').value = `t = ${fmt(time, 2)} / 6`;
  $('couplingOut').value = fmt(k, 1);
  $('currentNorm').textContent = fmt(normAt(k, time));
  $('peakNorm').textContent = `${fmt(peak.norm)}×`;
  $('peakTime').textContent = fmt(peak.time);
  const current = stateAt(k, time);
  $('currentState').textContent = `x₁ = ${fmt(current[0], 4)} · x₂ = ${fmt(current[1], 4)} · t = ${fmt(time, 2)}`;
  $('currentReading').textContent = peak.norm > 1 + 1e-10
    ? `At k = ${fmt(k, 1)}, this start reaches ${fmt(peak.norm)} times its initial distance from zero. The eigenvalues are still −1 and −2, and the state still tends to zero.`
    : `At k = ${fmt(k, 1)}, this start never exceeds its initial distance from zero. Its peak is 1 at the release. The eigenvalues are still −1 and −2.`;
  document.querySelectorAll('[data-k]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.k) === k)));
}

function announce(message) { $('announcement').textContent = message; }

function stop() {
  if (animation !== null) cancelAnimationFrame(animation);
  animation = null;
  previousTime = null;
  $('play').textContent = reducedMotion.matches ? 'Step +0.25' : 'Play';
  $('play').setAttribute('aria-pressed', 'false');
}

function frame(now) {
  if (previousTime === null) previousTime = now;
  time = Math.min(END_TIME, time + Math.min(100, now - previousTime) / 1000);
  previousTime = now;
  if (now - lastDraw > 30 || time >= END_TIME) { draw(); lastDraw = now; }
  if (time >= END_TIME) { stop(); announce('Reached t = 6. The trajectory continues toward zero.'); return; }
  animation = requestAnimationFrame(frame);
}

function setCoupling(value) {
  stop();
  k = value;
  $('coupling').value = String(k);
  samples = trajectory(k);
  peak = peakForInitial(k);
  draw();
}

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
$('coupling').addEventListener('input', event => setCoupling(Number(event.target.value)));
$('coupling').addEventListener('change', () => announce(`Coupling ${fmt(k, 1)}. Eigenvalues −1 and −2. Peak amplification ${fmt(peak.norm)} for this start.`));
document.querySelectorAll('[data-k]').forEach(button => button.addEventListener('click', () => {
  setCoupling(Number(button.dataset.k));
  announce(`Coupling ${fmt(k, 1)}. Peak amplification ${fmt(peak.norm)} for the same initial vector.`);
}));
$('time').addEventListener('input', event => { stop(); time = Number(event.target.value); draw(); });
$('time').addEventListener('change', () => announce(`Time ${fmt(time, 2)}. Norm ${fmt(normAt(k, time))}.`));
$('restart').addEventListener('click', () => { stop(); time = 0; draw(); announce('Reset to the same initial state (0, 1), with norm 1.'); });
$('showPeak').addEventListener('click', () => { stop(); time = peak.time; draw(); announce(`Peak ${fmt(peak.norm)} at time ${fmt(peak.time)} for this initial vector.`); });
$('play').addEventListener('click', () => {
  if (reducedMotion.matches) {
    stop(); time = time >= END_TIME ? 0 : Math.min(END_TIME, time + 0.25); draw();
    announce(`Time ${fmt(time, 2)}. Norm ${fmt(normAt(k, time))}.`);
    return;
  }
  if (animation !== null) { stop(); announce(`Paused at time ${fmt(time, 2)}.`); return; }
  if (time >= END_TIME) time = 0;
  $('play').textContent = 'Pause';
  $('play').setAttribute('aria-pressed', 'true');
  draw();
  animation = requestAnimationFrame(frame);
});
function applyMotionPreference() {
  stop();
  $('motionHint').textContent = reducedMotion.matches
    ? 'Reduced motion: Step advances 0.25 time units without animation. Restart or scrub to inspect any time.'
    : 'Start paused near the large excursion. Restart to release the same disturbance from t = 0, or scrub time.';
}
reducedMotion.addEventListener('change', applyMotionPreference);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
applyMotionPreference();
draw();
