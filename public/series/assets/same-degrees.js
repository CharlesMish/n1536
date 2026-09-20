import { GRAPHS, LABELS, POSITIONS, adjacency, components, cutEdges, distances, reachAt } from './same-degrees-math.js';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ring = Array.from({ length: 6 }, (_, i) => i);
let selected = 0, source = 0, hop = 0, timer = null;
const maxHop = () => Math.max(...GRAPHS.flatMap(graph => distances(graph.edges, source).filter(Number.isFinite)));

function setTheme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'uv' ? 'Paper' : 'UV';
  $('theme').setAttribute('aria-label', `Switch to ${value === 'uv' ? 'Paper' : 'UV'} presentation`);
  try { localStorage.setItem('same-reading-theme', value); } catch { /* Theme remains local to this page. */ }
}
let saved = 'uv';
try { saved = localStorage.getItem('same-reading-theme') || 'uv'; } catch { /* Storage is optional. */ }
setTheme(saved === 'paper' ? 'paper' : 'uv');
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'paper' ? 'uv' : 'paper'));

function nodeState(distance, id) {
  if (id === source) return 'source';
  if (!Number.isFinite(distance)) return 'unreachable';
  if (distance === hop) return 'frontier';
  return distance < hop ? 'reached' : 'waiting';
}
function networkSVG(graph, state) {
  const ds = state.distances;
  const paths = graph.edges.map(([u, v]) => {
    const [x1, y1] = POSITIONS[u], [x2, y2] = POSITIONS[v];
    const status = !Number.isFinite(ds[u]) ? 'unreachable' : ds[u] <= hop && ds[v] <= hop ? 'reached' : '';
    return `<path class="edge ${status}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
  }).join('');
  const nodes = POSITIONS.map(([x, y], i) => `<g class="node ${nodeState(ds[i], i)}" data-node="${i}" transform="translate(${x} ${y})"><title>${LABELS[i]}: degree 3; ${i === source ? 'source' : Number.isFinite(ds[i]) ? `${ds[i]} hops from ${LABELS[source]}` : 'unreachable from source'}</title><circle class="halo" r="23"/><circle class="disc" r="18"/><text class="node-letter" y="0">${LABELS[i]}</text><circle class="hit" r="27"/></g>`).join('');
  return `<svg viewBox="0 0 480 390" role="img" aria-labelledby="networkTitle networkDescription"><title id="networkTitle">${graph.name}: pulse from ${LABELS[source]}, hop ${hop}</title><desc id="networkDescription">${state.reached} of 12 vertices reached; ${state.waiting} reachable later; ${state.unreachable} unreachable. Each vertex has degree 3. Select the source using the menu or a letter in this diagram.</desc>${paths}${nodes}</svg>`;
}
function announce() {
  const graph = GRAPHS[selected], state = reachAt(graph.edges, source, hop);
  $('announcement').textContent = `${graph.name}. Source ${LABELS[source]}, hop ${hop}. ${state.reached} of 12 reached; ${state.unreachable} unreachable. Every degree remains three.`;
}
function draw() {
  const graph = GRAPHS[selected], state = reachAt(graph.edges, source, hop), maximum = maxHop();
  $('sceneTitle').textContent = graph.description;
  $('caseName').textContent = graph.name;
  $('caseNumber').textContent = `0${selected + 1} / NETWORK`;
  $('caseReading').textContent = hop === 0 ? 'Send a pulse or advance one hop. Three neighbors stay three in every network.' : `${state.frontier} new at this hop · ${state.waiting} reachable later · ${state.unreachable} unreachable.`;
  $('network').innerHTML = networkSVG(graph, state);
  $('hop').max = maximum;
  $('hop').value = hop;
  $('hopOut').value = `Hop ${hop} / ${maximum}`;
  $('source').value = source;
  $('step').disabled = hop >= maximum;
  for (const key of ['reached', 'frontier', 'waiting', 'unreachable']) $(key).textContent = state[key];
  const groupCount = components(graph.edges).length;
  $('structure').textContent = `${groupCount} component${groupCount === 1 ? '' : 's'} · ${cutEdges(graph.edges, ring).length} cross-ring edges · 18 edges total`;
  $('comparisonRows').innerHTML = GRAPHS.map((item, index) => {
    const reach = reachAt(item.edges, source, hop);
    const tally = Array.from({ length: 12 }, (_, i) => `<i class="${i < reach.reached ? 'is-reached' : i >= 12 - reach.unreachable ? 'is-unreachable' : ''}"></i>`).join('');
    return `<div class="comparison-row ${selected === index ? 'active' : ''}"><span>${item.name}</span><span class="tally" aria-hidden="true">${tally}</span><output aria-label="${item.name}: ${reach.reached} of 12 reached">${reach.reached} / 12</output></div>`;
  }).join('');
  const neighbors = adjacency(graph.edges);
  $('degreeRoster').innerHTML = LABELS.map((label, id) => `<li class="${source === id ? 'selected' : ''}"><strong>${label}</strong><span class="degree-value" aria-label="degree ${neighbors[id].length}">${neighbors[id].length}</span><small>${neighbors[id].map(i => LABELS[i]).join(' · ')}</small></li>`).join('');
  document.querySelectorAll('[data-graph]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.graph) === selected)));
  $('currentReading').textContent = hop === 0
    ? `The pulse starts at ${LABELS[source]}. At hop 1, every construction reaches exactly four vertices: the source and its three neighbors.`
    : hop === 1
      ? `Four vertices reached in every construction. Their matching degrees guarantee this first layer; they do not determine the layers beyond it.`
      : state.waiting > 0
        ? `${state.reached} vertices reached; ${state.waiting} can still be reached in later hops. The other constructions keep the same source and hop for comparison.`
        : state.unreachable > 0
          ? `The pulse has reached all six vertices in this component. The other six are unreachable from ${LABELS[source]}: no extra hops can cross a missing connection.`
          : `All twelve vertices are reached. ${state.lastHop} hops suffice from ${LABELS[source]} in ${graph.name}; three neighbors alone did not tell us that.`;
}
function stop() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  $('play').textContent = 'Send pulse';
  $('play').setAttribute('aria-pressed', 'false');
}
function tick() {
  timer = null;
  if (document.hidden) { stop(); return; }
  hop++;
  draw();
  if (hop >= maxHop()) { stop(); announce(); return; }
  timer = setTimeout(tick, 720);
}
function play() {
  if (timer !== null) { stop(); announce(); return; }
  if (reducedMotion.matches) { hop = maxHop(); draw(); announce(); return; }
  if (hop >= maxHop()) hop = 0;
  draw();
  $('play').textContent = 'Pause';
  $('play').setAttribute('aria-pressed', 'true');
  timer = setTimeout(tick, 720);
}
function chooseSource(value) {
  stop(); source = value; hop = 0; draw(); announce();
}
$('network').addEventListener('click', event => {
  const vertex = event.target.closest('[data-node]');
  if (vertex) chooseSource(Number(vertex.dataset.node));
});
$('source').addEventListener('change', event => chooseSource(Number(event.target.value)));
$('play').addEventListener('click', play);
$('restart').addEventListener('click', () => { stop(); hop = 0; draw(); announce(); });
$('step').addEventListener('click', () => { stop(); hop = Math.min(maxHop(), hop + 1); draw(); announce(); });
$('hop').addEventListener('input', event => { stop(); hop = Number(event.target.value); draw(); announce(); });
document.querySelectorAll('[data-graph]').forEach(button => button.addEventListener('click', () => { stop(); selected = Number(button.dataset.graph); draw(); announce(); }));
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', stop);
reducedMotion.addEventListener('change', () => { stop(); draw(); });
draw();
