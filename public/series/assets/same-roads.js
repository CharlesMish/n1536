import { roadsModel } from './same-roads-model.js';

var SVG_NS = 'http://www.w3.org/2000/svg';
var $ = function (id) { return document.getElementById(id); };

function svg(tag, attrs, text) {
  var node = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) if (attrs[k] !== '' && attrs[k] != null) node.setAttribute(k, String(attrs[k]));
  if (text != null) node.textContent = text;
  return node;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
function pathOf(segs) {
  return segs.map(function (s, i) { return (i ? 'L' : 'M') + s.p[0] + ' ' + s.p[1] + ' L' + s.q[0] + ' ' + s.q[1]; }).join(' ');
}
function glyph(kind, cls) {
  if (kind === 'dot') return svg('circle', { r: 5.5, class: cls || 'bead-dot' });
  if (kind === 'diamond') return svg('polygon', { points: '0,-6.2 6.2,0 0,6.2 -6.2,0', class: cls || 'bead-hollow' });
  return svg('rect', { x: -4.8, y: -4.8, width: 9.6, height: 9.6, rx: 1.5, class: cls || 'bead-hollow' });
}

function drawMap(m) {
  var gR = clear($('g-roads')), gS = clear($('g-strands')), gN = clear($('g-nodes')),
      gC = clear($('g-cars')), gL = clear($('g-labels')), gH = clear($('g-hit'));

  m.roads.forEach(function (r) {
    var line = { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 };
    var tone = r.tone ? ' is-' + r.tone : '';
    gR.appendChild(svg('line', Object.assign({ class: 'bedbase', 'stroke-width': r.width + 2.5 }, line)));
    gR.appendChild(svg('line', Object.assign({ class: 'casing is-' + r.kind + (r.empty ? ' is-empty' : '') + tone, 'stroke-width': r.width + 2.5 }, line)));
    gR.appendChild(svg('line', Object.assign({ class: 'bed' + tone, 'stroke-width': r.width }, line)));
  });
  m.chevrons.forEach(function (c) {
    gR.appendChild(svg('path', { d: 'M-3.4 -4 L2 0 L-3.4 4', class: 'chev is-' + c.kind, transform: 'translate(' + c.x + ' ' + c.y + ') rotate(' + c.deg + ')' }));
  });

  m.strands.forEach(function (s) {
    gS.appendChild(svg('path', { d: pathOf(s.segs), class: 'strand ' + (s.counted ? 'is-counted' : 'is-uncounted') }));
  });
  if (m.ghost) gS.appendChild(svg('path', { d: pathOf(m.ghost.segs), class: 'strand is-ghost' }));
  gS.appendChild(svg('path', { d: pathOf(m.moverStrand.segs), pathLength: 1, class: 'strand is-counted is-mover' + (m.test ? ' is-test' : '') }));

  Object.keys(m.nodes).forEach(function (k) {
    var g = svg('g', { class: 'node', transform: 'translate(' + m.nodes[k][0] + ' ' + m.nodes[k][1] + ')' });
    g.appendChild(svg('circle', { r: 23 }));
    g.appendChild(svg('text', {}, k));
    gN.appendChild(g);
  });

  m.pills.forEach(function (p) {
    var w = p.big ? 46 : 31, h = p.big ? 18 : 14, cap = h / 2;
    var x0 = p.dir === 'e' ? -cap : -(w - cap);
    var tx = p.dir === 'e' ? (w - cap + cap * 0.55) / 2 : -(w - cap + cap * 0.55) / 2;
    var outer = svg('g', { transform: 'translate(' + p.x + ' ' + p.y + ')' });
    var g = svg('g', { class: 'pill is-' + p.tone + (p.counted ? ' is-counted' : ' is-uncounted') + (p.big ? ' is-big' : '') });
    g.style.animationDelay = p.delay + 'ms';
    g.appendChild(svg('rect', { x: x0, y: -cap, width: w, height: h, rx: cap }));
    g.appendChild(svg('text', { x: tx, y: 0.5 }, p.text));
    outer.appendChild(g);
    gC.appendChild(outer);
  });
  if (m.ghost) {
    var gg = svg('g', { transform: 'translate(' + m.ghost.x + ' ' + m.ghost.y + ')' });
    gg.appendChild(svg('circle', { r: 5.5, class: 'bead-ghost' }));
    gC.appendChild(gg);
  }
  var mover = null;
  m.beads.forEach(function (b) {
    var g = svg('g', { transform: 'translate(' + b.x + ' ' + b.y + ')' });
    if (b.halo) g.appendChild(svg('circle', { r: 10, class: 'bead-halo' }));
    g.appendChild(glyph(b.glyph));
    gC.appendChild(g);
    if (b.mover) mover = b;
  });

  function label(key, x, y, anchor, lines, extra) {
    var t = svg('text', { class: 'lbl' + (extra || ''), 'text-anchor': anchor });
    lines.forEach(function (ln, i) {
      t.appendChild(svg('tspan', { x: x, y: y + i * 14, class: 'l' + (i + 1) }, ln));
    });
    gL.appendChild(t);
  }
  var L = m.labels;
  label('wn', 10, 18, 'start', L.wn);
  label('ne', 380, 18, 'end', L.ne);
  label('ws', 10, 316, 'start', L.ws);
  label('se', 380, 316, 'end', L.se, L.seTone ? ' is-' + L.seTone : '');
  label('ns', 165, 154, 'end', L.ns, ' is-bridge');
  if (L.seChip) {
    var chip = svg('g', { class: 'lblchip is-' + L.seTone, transform: 'translate(332 292)' });
    chip.appendChild(svg('rect', { x: -48, y: -9, width: 96, height: 18, rx: 9 }));
    chip.appendChild(svg('text', { y: 0.5 }, L.seChip));
    gL.appendChild(chip);
  }

  var hitBridge = svg('rect', { class: 'hit', x: 171, y: 58, width: 48, height: 224 });
  hitBridge.addEventListener('click', toggleMove);
  gH.appendChild(hitBridge);
  if (mover) {
    var hitCar = svg('circle', { class: 'hit', cx: mover.x, cy: mover.y, r: 18 });
    hitCar.addEventListener('click', toggleMove);
    gH.appendChild(hitCar);
  }
  $('map-desc').textContent = m.aria;
}

const buttons = [...document.querySelectorAll('.exhibit-switcher button')];
const cases = ['one', 'two', 'solo'];
const names = ['The empty bridge', 'Two dispatchers', 'Every car on the bridge'];
const labels = ['01 / One dispatcher', '02 / Two dispatchers', '03 / Individual drivers'];
const hash = new URLSearchParams(location.hash.slice(1));
let current = cases.includes(hash.get('case')) ? hash.get('case') : 'one';
let testing = hash.get('test') === '1';

function totalReading(tile) {
  return tile.changed ? `${tile.from} → ${tile.to}` : String(tile.from);
}

function render(announce = true) {
  const model = roadsModel(current, testing);
  const i = cases.indexOf(current);
  drawMap(model);
  $('caseNumber').textContent = labels[i];
  $('caseName').textContent = names[i];
  $('caseReading').textContent = model.blurb;
  $('ownerLabel').textContent = current === 'solo' ? 'This driver · minutes' : 'Dispatcher’s fleet · car-minutes';
  $('owner').textContent = totalReading(model.tiles.counted);
  $('all').textContent = totalReading(model.tiles.all);
  $('split').textContent = model.split;
  $('move').textContent = testing ? 'Return to settled routes' : 'Test one car · ' + model.moveLabel;
  $('move').setAttribute('aria-pressed', String(testing));
  $('mapState').textContent = testing ? 'Hypothetical move' : 'Settled assignment';
  $('rosterLabel').textContent = '02 / Minutes per car · ' + ['all twelve counted', 'Fleet A counts the first six', 'the driver counts the first car'][i];
  const roster = model.cells.map(car => {
    const li = document.createElement('li');
    li.classList.toggle('other', !car.counted);
    li.classList.toggle('mover', car.mover);
    li.setAttribute('aria-label', `${car.mover ? 'Moving car' : 'Car'}, route ${car.route}, ${car.min} minutes, ${car.counted ? 'counted' : 'outside fleet'}${car.delta ? ', change ' + car.delta : ''}`);
    const route = document.createElement('span');
    route.textContent = car.route;
    li.append(route, String(car.min));
    if (car.delta) {
      const delta = document.createElement('span');
      delta.className = car.tone;
      delta.textContent = car.delta;
      li.append(delta);
    }
    return li;
  });
  $('roster').replaceChildren(...roster);
  $('routeTitle').textContent = model.title + ' · ' + $('mapState').textContent;
  $('routes').replaceChildren(...model.routeRows.map(route => {
    const tr = document.createElement('tr');
    for (const value of [route.name, route.path, route.cars, route.min]) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    if (route.note) {
      const note = document.createElement('small');
      note.textContent = route.note;
      tr.lastChild.append(note);
    }
    return tr;
  }));
  for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.case === current));
  if (announce) $('announcement').textContent = model.aria;
}

function toggleMove() { testing = !testing; render(); }
$('move').addEventListener('click', toggleMove);
for (const button of buttons) button.addEventListener('click', () => {
  current = button.dataset.case;
  testing = false;
  render();
});

function setTheme(value) {
  const selected = value === 'paper' ? 'paper' : 'uv';
  document.documentElement.dataset.theme = selected;
  const next = selected === 'paper' ? 'UV' : 'Paper';
  $('theme').textContent = next;
  $('theme').setAttribute('aria-label', 'Switch to ' + next + ' presentation');
  try { localStorage.setItem('same-reading-theme', selected); } catch { /* Optional storage. */ }
}
let saved;
try { saved = localStorage.getItem('same-reading-theme'); } catch { /* Optional storage. */ }
setTheme(['uv', 'paper'].includes(hash.get('theme')) ? hash.get('theme') : saved);
$('theme').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'uv' ? 'paper' : 'uv'));
document.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.target.closest('dialog, input, textarea, select, [contenteditable], #study-notes')) return;
  const key = event.key.toLowerCase();
  if (/^[1-3]$/.test(key)) buttons[Number(key) - 1].click();
  else if (key === 'm') toggleMove();
  else if (key === 'p') $('theme').click();
  else if (key === 'r') $('readingLink').click();
  else if (buttons.includes(event.target) && ['arrowleft', 'arrowright', 'home', 'end'].includes(key)) {
    const next = key === 'home' ? 0 : key === 'end' ? 2 : (buttons.indexOf(event.target) + (key === 'arrowright' ? 1 : 2)) % 3;
    buttons[next].focus();
    buttons[next].click();
  } else return;
  event.preventDefault();
});

render(false);
$('interactive').hidden = false;
$('routeAudit').hidden = false;
$('staticPreview').hidden = true;
