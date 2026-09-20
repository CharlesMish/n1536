import { SYSTEM, SPACING, histories, appliedForce, accumulatedImpulse, response, residualAmplitude, peakDisplacement } from './same-impulse-model.js';

const $ = id => document.getElementById(id);
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const compactPlot = matchMedia('(max-width: 760px)');
const plots = { force: { left: 40, right: 306, top: 16, bottom: 153, width: 320, height: 184 }, displacement: { left: compactPlot.matches ? 45 : 55, right: compactPlot.matches ? 415 : 735, top: 20, bottom: 238, width: compactPlot.matches ? 440 : 760, height: 270 } };
const px = (t, type = 'force') => plots[type].left + (plots[type].right - plots[type].left) * t / SYSTEM.duration;
const forceY = force => plots.force.bottom - (plots.force.bottom - plots.force.top) * force / 4;
const displacementY = x => (plots.displacement.top + plots.displacement.bottom) / 2 - (plots.displacement.bottom - plots.displacement.top) * x / 0.72;
let spacing = SPACING.initial, time = 0, cases = histories(spacing);
let activeCase = 'pair';
let frame = null, timer = null, playing = false, last = null;

function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'paper' ? 'UV' : 'Paper';
  $('theme').setAttribute('aria-label', `Switch to ${value === 'paper' ? 'UV' : 'Paper'} presentation`);
  try { localStorage.setItem('same-reading-theme', value); } catch { /* Storage can be disabled. */ }
}
let savedTheme = 'uv';
try { savedTheme = localStorage.getItem('same-reading-theme') || 'uv'; } catch { /* Keep UV. */ }
theme(savedTheme === 'paper' ? 'paper' : 'uv');
$('theme').addEventListener('click', () => theme(document.documentElement.dataset.theme === 'paper' ? 'uv' : 'paper'));

function chart(history, type) {
  const force = type === 'force', y = force ? forceY : displacementY;
  const plot = plots[type], px = t => plot.left + (plot.right - plot.left) * t / SYSTEM.duration;
  const evaluate = t => force ? appliedForce(history, t) : response(history, t).x;
  const points = Array.from({ length: 1201 }, (_, index) => {
    const t = SYSTEM.duration * index / 1200;
    return `${index ? 'L' : 'M'}${px(t).toFixed(3)},${y(evaluate(t)).toFixed(3)}`;
  }).join(' ');
  const ticks = force ? [0, 2, 4] : [-0.3, 0, 0.3];
  let result = `<svg class="impulse-chart" viewBox="0 0 ${plot.width} ${plot.height}" role="img" aria-label="${history.name}: ${force ? 'applied force from zero to four newtons' : 'displacement from minus to plus 0.36 meters'}, over zero to eight seconds. All cases use this same scale.">`;
  result += ticks.map(value => `<path class="${value === 0 ? 'zero' : 'grid'}" d="M${plot.left} ${y(value)}H${plot.right}"/><text x="${plot.left - 6}" y="${y(value) + 4}" text-anchor="end">${value}</text>`).join('');
  result += [0, 2, 4, 6, 8].map(t => `<text x="${px(t)}" y="${plot.bottom + 21}" text-anchor="middle">${t}</text>`).join('');
  if (force) result += `<path class="area" d="${points} L${plot.right},${forceY(0)}L${plot.left},${forceY(0)}Z"/>`;
  result += `<path class="forcing-end" d="M${px(3)} ${plot.top}V${plot.bottom}"/><path class="curve" d="${points}"/>`;
  result += `<path class="cursor" id="${history.id}-${type}-cursor" d="M${px(time)} ${plot.top}V${plot.bottom}"/><circle class="cursor-dot" id="${history.id}-${type}-dot" cx="${px(time)}" cy="${y(evaluate(time))}" r="3.5"/>`;
  return result + '</svg>';
}

function mechanicalView(history) {
  return `<svg class="motion" viewBox="0 0 320 100" role="img" aria-label="${history.name}: mass connected to the same spring and damper; displacement is magnified equally in all three cases.">
    <path class="wall" d="M22 12V73"/><path class="mechanism" id="${history.id}-spring" d="M22 28H140"/>
    <path class="mechanism" d="M22 56H66M66 48H91V64H66M80 48V64"/><path class="mechanism" id="${history.id}-damper" d="M80 56H155"/>
    <path class="neutral" d="M184 7V78"/><g id="${history.id}-mass"><rect class="mass" x="163" y="17" width="42" height="51" rx="4"/><text x="184" y="47" text-anchor="middle">1 kg</text></g>
    <path class="mechanism" d="M122 86H246m-4-4 4 4-4 4"/><text x="184" y="99" text-anchor="middle">x = 0 at dotted line</text></svg>`;
}

function build() {
  cases = histories(spacing);
  $('spacingOut').value = `${spacing.toFixed(2)} s`;
  $('spacing').value = spacing;
  $('halfPeriod').setAttribute('aria-pressed', String(Math.abs(spacing - 1) < 1e-9));
  $('fullPeriod').setAttribute('aria-pressed', String(Math.abs(spacing - 2) < 1e-9));
  $('cases').innerHTML = cases.map(history => {
    const peak = peakDisplacement(history), residual = residualAmplitude(history);
    const support = history.id === 'early' ? 'One 0.6 s pulse · 1 N·s' : history.id === 'broad' ? 'One 3 s push · 1 N·s' : `Two 0.6 s pulses · 0.5 N·s each`;
    const reading = history.id === 'early' ? 'One concentrated push sets the mass in motion. The spring keeps moving it after the applied force has ended.' : history.id === 'broad' ? 'The same force–time area arrives over three seconds. The mass responds while the push is still being delivered.' : `Two equal pushes, ${spacing.toFixed(2)} seconds apart. The second meets a mass already moving; change the gap to reinforce or quiet it.`;
    return `<article class="impulse-case case-${history.id}" id="case-${history.id}" ${history.id === activeCase ? '' : 'hidden'} aria-label="${history.name}">
      <figure class="motion-specimen">${mechanicalView(history)}</figure>
      <figure class="displacement-specimen exhibit-visual"><figcaption class="chart-title"><span>Displacement · m / time · s</span><output id="${history.id}-displacement" aria-live="off">0.000 m</output></figcaption>${chart(history, 'displacement')}</figure>
      <figure class="force-specimen"><figcaption class="chart-title"><span>Applied force · N</span><output id="${history.id}-force" aria-live="off">0.000 N</output></figcaption>${chart(history, 'force')}</figure>
      <section class="exhibit-reading"><span class="small-label">${history.letter} / Applied impulse 1 N·s</span><h2>${history.name}</h2><p>${reading}</p><p class="case-support">${support}</p>
      <dl class="case-metrics"><div><dt>Peak |x| · 0–8 s</dt><dd title="At ${peak.time.toFixed(3)} s">${peak.magnitude.toFixed(3)} <small>m</small></dd></div><div><dt>Residual at 3 s</dt><dd>${residual.toFixed(3)} <small>m</small></dd></div><div class="impulse-constant"><dt>Total applied impulse</dt><dd>1.000 <small>N·s</small></dd></div></dl></section>
      <p class="sr-only" id="${history.id}-now"></p></article>`;
  }).join('');
  const pairResidual = residualAmplitude(cases[2]), earlyResidual = residualAmplitude(cases[0]);
  $('currentReading').textContent = `With C’s pulses ${spacing.toFixed(2)} s apart, its residual envelope at 3 s is ${pairResidual.toFixed(3)} m, compared with ${earlyResidual.toFixed(3)} m after A’s early pulse. Try spacings of 1 s and 2 s, then inspect the force and displacement at the second push.`;
  selectCase(activeCase, false);
  drawTime();
}

function selectCase(id, announce = true) {
  activeCase = id;
  document.querySelectorAll('[data-case]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.case === id)));
  for (const history of cases) $('case-' + history.id).hidden = history.id !== id;
  document.querySelector('.exhibit-stage').dataset.activeCase = id;
  document.querySelector('.timing-panel').hidden = id !== 'pair';
  if (announce) $('announcement').textContent = cases.find(history => history.id === id).name + '. Applied impulse remains 1 newton second. The time and scales are unchanged.';
}

document.querySelectorAll('[data-case]').forEach(button => button.addEventListener('click', () => selectCase(button.dataset.case)));

function drawTime() {
  $('time').value = time;
  $('timeOut').value = `${time.toFixed(2)} / 8 s`;
  $('time').setAttribute('aria-valuetext', `${time.toFixed(2)} seconds`);
  for (const history of cases) {
    const state = response(history, time), force = appliedForce(history, time), shift = state.x / 0.36 * 63;
    const massLeft = 163 + shift, endSpring = massLeft - 8, zigStart = 40;
    const zigEnd = endSpring - 10, step = (zigEnd - zigStart) / 12;
    let spring = `M22 28H${zigStart}`;
    for (let i = 1; i <= 12; i++) spring += `L${(zigStart + i * step).toFixed(3)} ${i === 12 ? 28 : i % 2 ? 21 : 35}`;
    spring += `H${massLeft.toFixed(3)}`;
    $(`${history.id}-spring`).setAttribute('d', spring);
    $(`${history.id}-damper`).setAttribute('d', `M80 56H${massLeft.toFixed(3)}`);
    $(`${history.id}-mass`).setAttribute('transform', `translate(${shift.toFixed(3)} 0)`);
    $(`${history.id}-force`).value = `${force.toFixed(3)} N`;
    $(`${history.id}-displacement`).value = `${Math.abs(state.x) < 0.0005 ? '0.000' : state.x.toFixed(3)} m`;
    for (const [type, y] of [['force', forceY(force)], ['displacement', displacementY(state.x)]]) {
      const plot = plots[type];
      $(`${history.id}-${type}-cursor`).setAttribute('d', `M${px(time, type).toFixed(3)} ${plot.top}V${plot.bottom}`);
      $(`${history.id}-${type}-dot`).setAttribute('cx', px(time, type).toFixed(3));
      $(`${history.id}-${type}-dot`).setAttribute('cy', y.toFixed(3));
    }
    $(`${history.id}-now`).textContent = `At ${time.toFixed(2)} seconds: displacement ${state.x.toFixed(3)} meters, velocity ${state.v.toFixed(3)} meters per second; applied impulse so far ${accumulatedImpulse(history, time).toFixed(3)} newton seconds.`;
  }
}

function stop() {
  playing = false;
  if (frame !== null) cancelAnimationFrame(frame);
  if (timer !== null) clearTimeout(timer);
  frame = timer = last = null;
  $('play').textContent = motionPreference.matches ? 'Step +0.25' : 'Play';
  $('play').setAttribute('aria-pressed', 'false');
}

function advance(timestamp) {
  if (!playing) return;
  if (last === null) last = timestamp;
  time = Math.min(SYSTEM.duration, time + Math.min(0.1, (timestamp - last) / 1000));
  last = timestamp; drawTime();
  if (time >= SYSTEM.duration) stop();
  else frame = requestAnimationFrame(advance);
}

$('play').addEventListener('click', () => {
  if (motionPreference.matches) {
    stop(); time = time >= SYSTEM.duration ? 0 : Math.min(SYSTEM.duration, time + 0.25); drawTime();
    $('announcement').textContent = `Time ${time.toFixed(2)} seconds.`; return;
  }
  if (playing) { stop(); return; }
  if (time >= SYSTEM.duration) { time = 0; drawTime(); }
  playing = true;
  $('play').textContent = 'Pause'; $('play').setAttribute('aria-pressed', 'true');
  frame = requestAnimationFrame(advance);
});
$('restart').addEventListener('click', () => { stop(); time = 0; drawTime(); });
$('time').addEventListener('input', event => { stop(); time = Number(event.target.value); drawTime(); });
function setSpacing(value) {
  stop(); spacing = value; build();
}
$('spacing').addEventListener('input', event => setSpacing(Number(event.target.value)));
$('spacing').addEventListener('change', () => { $('announcement').textContent = `Pulse spacing ${spacing.toFixed(2)} seconds. All three applied impulses remain 1 newton second. C residual at 3 seconds: ${residualAmplitude(cases[2]).toFixed(3)} meters.`; });
for (const [id, value] of [['halfPeriod', 1], ['fullPeriod', 2]]) $(id).addEventListener('click', () => {
  setSpacing(value); $('announcement').textContent = `Pulse spacing ${spacing.toFixed(2)} seconds. C residual at 3 seconds: ${residualAmplitude(cases[2]).toFixed(3)} meters. All applied impulses remain 1 newton second.`;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
motionPreference.addEventListener('change', stop);
compactPlot.addEventListener('change', () => {
  // Change only drawing dimensions; every history keeps the same physical axes.
  Object.assign(plots.displacement, { left: compactPlot.matches ? 45 : 55, right: compactPlot.matches ? 415 : 735, width: compactPlot.matches ? 440 : 760 });
  build();
});
build();
stop();
