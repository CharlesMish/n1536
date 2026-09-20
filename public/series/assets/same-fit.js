import { DATASETS, STATS, SUMMARY_FIELDS, sharedSummary } from './same-fit-model.js';

const $ = id => document.getElementById(id);
const signed = value => `${value < -0.0005 ? '−' : '+'}${Math.abs(value).toFixed(3)}`;
const fixed = (value, digits = 6) => Math.abs(value) < 0.5 * 10 ** -digits ? (0).toFixed(digits) : value.toFixed(digits);
let view = 'scatter';
let activeDataset = 0;
const caseNames = ['Scattered', 'Curved', 'One departure', 'One distant x'];
const caseDescriptions = ['Eleven observations vary around a rising line. The residuals retain that scatter.', 'The fitted line leaves a bend behind. The residuals expose the curve in these observations.', 'One high observation departs from an otherwise narrow trend. Its residual stands apart.', 'Ten observations share x = 8. One at x = 19 sets the horizontal span, yet lies on the fitted line.'];
let row = 3;
let resizeFrame = null;
let previousWidth = 0;
let geometry = [];

function marker(dataset, x, y, radius, className) {
  if (dataset === 0) return `<circle class="${className}" cx="${x}" cy="${y}" r="${radius}"/>`;
  if (dataset === 1) return `<rect class="${className}" x="${x - radius}" y="${y - radius}" width="${radius * 2}" height="${radius * 2}"/>`;
  if (dataset === 2) return `<path class="${className}" d="M${x} ${y - radius * 1.15}L${x + radius} ${y + radius * 0.85}H${x - radius}Z"/>`;
  return `<path class="${className}" d="M${x} ${y - radius * 1.2}L${x + radius * 1.2} ${y}L${x} ${y + radius * 1.2}L${x - radius * 1.2} ${y}Z"/>`;
}

function plotSVG(index, hostId = 'plot' + index, plotView = view) {
  const dataset = DATASETS[index], stats = STATS[index];
  const width = Math.max(260, $(hostId).clientWidth);
  const height = hostId === 'primaryPlot' ? Math.max(260, $(hostId).clientHeight) : hostId === 'residualInset' ? 180 : Math.max(245, Math.min(300, width * 0.54 + 36));
  const left = 43, right = width - 19, top = 30, bottom = height - 36;
  const x = value => left + value / 20 * (right - left);
  const y = plotView === 'scatter'
    ? value => bottom - value / 15 * (bottom - top)
    : value => bottom - (value + 4) / 8 * (bottom - top);
  const selected = dataset.points[row - 1];
  const residual = stats.residuals[row - 1];
  geometry[hostId] = dataset.points.map((point, i) => ({ x: x(point.x), y: y(plotView === 'scatter' ? point.y : stats.residuals[i]), row: point.row }));
  let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="fitTitle${hostId} fitDesc${hostId}" data-view="${plotView}"><title id="fitTitle${hostId}">Dataset ${dataset.id}: ${plotView === 'scatter' ? 'points and fitted line' : 'residuals versus x'}</title><desc id="fitDesc${hostId}">Eleven observations on fixed axes shared with the other datasets. Selected row ${row}: x ${selected.x}, y ${selected.y.toFixed(2)}, fitted y ${fixed(stats.fitted[row - 1], 3)}, residual ${signed(residual)}. Use the Inspect row selector for keyboard inspection.</desc>`;
  for (const value of [0, 5, 10, 15, 20]) svg += `<path class="grid-line" d="M${x(value)} ${top}V${bottom}"/><text x="${x(value)}" y="${bottom + 20}" text-anchor="middle">${value}</text>`;
  for (const value of plotView === 'scatter' ? [0, 5, 10, 15] : [-4, -2, 0, 2, 4]) svg += `<path class="grid-line" d="M${left} ${y(value)}H${right}"/><text x="${left - 10}" y="${y(value) + 4}" text-anchor="end">${String(value).replace('-', '−')}</text>`;
  svg += `<path class="axis-line" d="M${left} ${top}V${bottom}H${right}"/><text class="axis-title" x="${left}" y="17">${plotView === 'scatter' ? 'y' : 'y − ŷ'}</text><text class="axis-title" x="${right}" y="${height - 4}" text-anchor="end">x →</text>`;
  if (plotView === 'scatter') {
    svg += `<path class="fit-line" d="M${x(0)} ${y(stats.intercept)}L${x(20)} ${y(stats.intercept + stats.slope * 20)}"/><path class="selected-residual" d="M${x(selected.x)} ${y(selected.y)}V${y(stats.fitted[row - 1])}"/>`;
  } else {
    svg += `<path class="zero-line" d="M${left} ${y(0)}H${right}"/><path class="selected-residual" d="M${x(selected.x)} ${y(residual)}V${y(0)}"/>`;
  }
  geometry[hostId].forEach(point => { svg += marker(index, point.x, point.y, 4.5, 'observation'); });
  const point = geometry[hostId][row - 1];
  svg += marker(index, point.x, point.y, 8, 'selected-outline');
  svg += `<text class="selected-label" x="${Math.min(right - 8, Math.max(left + 22, point.x + 13))}" y="${Math.max(top + 11, point.y - 12)}" text-anchor="${point.x > right - 42 ? 'end' : 'start'}">${row}</text>`;
  // Pointer hit areas complement the native row selector; points are not a 44-item tab sequence.
  geometry[hostId].forEach(point => { svg += `<circle class="point-target" cx="${point.x}" cy="${point.y}" r="15"/>`; });
  return svg + '</svg>';
}

function renderPlots() {
  DATASETS.forEach((dataset, index) => {
    $('plot' + index).innerHTML = plotSVG(index);
    const point = dataset.points[row - 1];
    $('reading' + index).textContent = `Row ${row} · (${point.x}, ${point.y.toFixed(2)}) · ŷ ${fixed(STATS[index].fitted[row - 1], 3)} · residual ${signed(STATS[index].residuals[row - 1])}`;
  });
  $('activeDataset').className = `fit-specimen exhibit-specimen exhibit-visual dataset-${activeDataset}`;
  $('activeResidual').className = `residual-inset dataset-${activeDataset}`;
  $('primaryPlot').innerHTML = plotSVG(activeDataset, 'primaryPlot');
  $('residualInset').innerHTML = plotSVG(activeDataset, 'residualInset', 'residual');
  $('activeDatasetLabel').textContent = `${DATASETS[activeDataset].id} · ${caseNames[activeDataset]}`;
  $('primaryScale').textContent = view === 'scatter' ? 'Fixed axes · x 0–20 · y 0–15' : 'Fixed axes · x 0–20 · residual −4–4';
  $('primaryReading').textContent = $('reading' + activeDataset).textContent;
  $('fitSelectedPoint').textContent = $('reading' + activeDataset).textContent;
  $('fitCaseNumber').textContent = `0${activeDataset + 1} / Anscombe’s four datasets`;
  $('fitCaseTitle').textContent = caseNames[activeDataset];
  $('fitCaseDescription').textContent = caseDescriptions[activeDataset];
  document.querySelectorAll('button[data-dataset]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.dataset) === activeDataset)));
  $('row').value = String(row);
  $('previousRow').disabled = row === 1;
  $('nextRow').disabled = row === 11;
  document.querySelectorAll('#dataBody tr').forEach(tr => tr.classList.toggle('selected-row', Number(tr.dataset.row) === row));
  $('scaleNote').textContent = view === 'scatter' ? 'Shared axes · x: 0–20 · y: 0–15' : 'Shared axes · x: 0–20 · residual: −4–4';
  $('viewHelp').textContent = view === 'scatter'
    ? 'Solid lines are each dataset’s actual least-squares fit. The selected point has a larger outline; its vertical segment is y minus fitted y.'
    : 'Residual = observed y minus fitted y. The dashed horizontal line marks zero. These are the same eleven observations, with a new vertical quantity and one shared residual scale.';
  document.querySelectorAll('button[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
}

function announce(message) { $('announcement').textContent = message; }
function inspectRow(value, message) {
  row = Math.max(1, Math.min(11, value));
  renderPlots();
  announce(message || `Row ${row} selected in all four datasets. The point coordinates and residuals appear below each plot.`);
}

function renderAudit() {
  const shared = sharedSummary();
  $('sharedSummary').innerHTML = SUMMARY_FIELDS.slice(0, 5).map(field => `<div data-stat="${field.key}"><dt>${field.label}</dt><dd>${shared[field.key] ?? 'Different'}</dd><small>${field.digits} decimal place${field.digits === 1 ? '' : 's'}</small></div>`).join('');
  $('roundedLine').textContent = shared.intercept !== null && shared.slope !== null
    ? `y = ${shared.intercept} + ${shared.slope}x` : 'The rounded lines differ.';
  $('exhibitRoundedLine').textContent = $('roundedLine').textContent;
  const fields = [{ key: 'n', label: 'Observations', digits: 0 }, ...SUMMARY_FIELDS,
    { key: 'rSquared', label: 'R²', digits: null }, { key: 'sse', label: 'Residual sum of squares', digits: null }];
  $('auditBody').innerHTML = fields.map(field => {
    const values = STATS.map(stats => stats[field.key]);
    const range = Math.max(...values) - Math.min(...values);
    const summary = field.key === 'n' ? '11 · exact' : field.digits === null ? 'Not in summary' : `${shared[field.key] ?? 'Different'} · ${field.digits} dp`;
    return `<tr data-stat="${field.key}"><th scope="row">${field.label}</th>${values.map(value => `<td>${fixed(value, field.key === 'n' ? 0 : 6)}</td>`).join('')}<td>${fixed(range, 6)}</td><td>${summary}</td></tr>`;
  }).join('');
  $('dataBody').innerHTML = Array.from({ length: 11 }, (_, i) => `<tr data-row="${i + 1}"><th scope="row">${i + 1}</th>${DATASETS.map(dataset => `<td>${dataset.points[i].x}, ${dataset.points[i].y.toFixed(2)}</td>`).join('')}</tr>`).join('');
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
function openAudit() { $('study-notes').open = true; $('audit').open = true; }
$('openAudit').addEventListener('click', openAudit);
$('stageAudit').addEventListener('click', openAudit);
if (location.hash === '#audit') openAudit();
document.querySelectorAll('button[data-dataset]').forEach(button => button.addEventListener('click', () => {
  activeDataset = Number(button.dataset.dataset);
  renderPlots();
  announce(`Dataset ${DATASETS[activeDataset].id}: ${caseNames[activeDataset]}. Eleven points and their actual fitted line; the rounded summary remains the same.`);
}));
$('row').innerHTML = Array.from({ length: 11 }, (_, i) => `<option value="${i + 1}">${i + 1} / 11</option>`).join('');
$('row').addEventListener('change', event => inspectRow(Number(event.target.value)));
$('previousRow').addEventListener('click', () => inspectRow(row - 1));
$('nextRow').addEventListener('click', () => inspectRow(row + 1));
$('inspectIII').addEventListener('click', () => { activeDataset = 2; inspectRow(3, 'Row 3 selected. Dataset III’s point at (13, 12.74) has residual ' + signed(STATS[2].residuals[2]) + '.'); });
$('inspectIV').addEventListener('click', () => { activeDataset = 3; inspectRow(8, 'Row 8 selected. Dataset IV’s point at (19, 12.50) has zero residual to displayed precision, yet is the only point away from x = 8.'); });
document.querySelectorAll('button[data-view]').forEach(button => button.addEventListener('click', () => {
  view = button.dataset.view;
  renderPlots();
  announce(view === 'scatter' ? 'Points and actual fitted lines. Shared y range zero to fifteen.' : 'Residuals versus x. Shared residual range minus four to four. The selected row is unchanged.');
}));
DATASETS.forEach((dataset, index) => $('plot' + index).addEventListener('click', event => {
  const svg = event.currentTarget.querySelector('svg');
  const matrix = svg.getScreenCTM();
  if (!matrix) return;
  const pointer = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const nearest = geometry['plot' + index].reduce((best, point) => {
    const distance = Math.hypot(point.x - pointer.x, point.y - pointer.y);
    return distance < best.distance ? { distance, row: point.row } : best;
  }, { distance: 24, row: null });
  if (nearest.row !== null) inspectRow(nearest.row, `Dataset ${dataset.id}, row ${nearest.row} selected. Matching row numbers are highlighted for table inspection, not shared subjects.`);
}));

for (const hostId of ['primaryPlot', 'residualInset']) $(hostId).addEventListener('click', event => {
  const svg = $(hostId).querySelector('svg');
  const matrix = svg?.getScreenCTM();
  if (!matrix) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  const nearest = geometry[hostId].reduce((best, item) => {
    const distance = Math.hypot(item.x - point.x, item.y - point.y);
    return distance < best.distance ? { distance, row: item.row } : best;
  }, { distance: 24, row: null });
  if (nearest.row !== null) inspectRow(nearest.row);
});

renderAudit();
renderPlots();
new ResizeObserver(() => {
  const width = `${$('plots').clientWidth}/${$('primaryPlot').clientWidth}/${$('primaryPlot').clientHeight}`;
  if (width === previousWidth) return;
  previousWidth = width;
  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { resizeFrame = null; renderPlots(); });
}).observe(document.querySelector('.exhibit-stage'));
$('study-notes').addEventListener('toggle', renderPlots);
