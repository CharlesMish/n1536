export function roadsModel(caseId, test) {
  var P = 3;
  var NODE = { W: [42, 170], N: [195, 34], S: [195, 306], E: [348, 170] };
  var ROAD = { wn: ['W', 'N'], ne: ['N', 'E'], ws: ['W', 'S'], se: ['S', 'E'], ns: ['N', 'S'] };
  var KIND = { wn: 'congest', se: 'congest', ne: 'fixed', ws: 'fixed', ns: 'bridge' };
  var ROUTE = { north: ['wn', 'ne'], south: ['ws', 'se'], bridge: ['wn', 'ns', 'se'] };
  var HOME = { north: 'ne', south: 'ws', bridge: 'ns' };
  var NAME = { north: 'North', south: 'South', bridge: 'Bridge' };
  var PATH = { north: 'W → N → E', south: 'W → S → E', bridge: 'W → N → S → E' };

  function fill(n, f, r) { var a = []; for (var i = 0; i < n; i++) a.push({ f: f, r: r }); return a; }
  var CASES = {
    one: {
      testHeadline: 'One driver saves 11 minutes. Six fleetmates lose 2 each.',
      index: 1, title: 'One fleet of 12', to: 'bridge', other: 'dot', step: 20,
      cars: [{ f: 'a', r: 'north', mover: true }].concat(fill(5, 'a', 'north'), fill(6, 'a', 'south')),
      headline: 'Open bridge, zero cars: why does the dispatcher leave it empty?',
      idle: 'One dispatcher runs all twelve cars. With the bridge empty, its route adds up to 29 minutes. Every car currently takes 42. Move one car and see who pays.',
      verdict: 'The first car to take the bridge needs 31 minutes and saves 11. Six fleetmates on S → E each lose 2 minutes. The dispatcher counts all twelve minutes of delay. The bridge stays empty.',
      groups: [{ label: 'Fleet A · all 12 counted', n: 12, counted: true, glyph: 'dot' }],
      countedLabel: 'Dispatcher counts', countedFoot: 'Every car is on its books', meanTail: ''
    },
    two: {
      testHeadline: 'Fleet A spends one extra minute. Fleet B spends eight.',
      index: 2, title: 'Two fleets of 6', to: 'bridge', other: 'diamond', step: 20,
      cars: [{ f: 'a', r: 'north', mover: true }].concat(fill(1, 'a', 'north'), fill(2, 'a', 'south'), fill(2, 'a', 'bridge'),
        fill(2, 'b', 'north'), fill(2, 'b', 'south'), fill(2, 'b', 'bridge')),
      headline: 'Each dispatcher counts six cars and sends two over the bridge.',
      idle: 'Two dispatchers, six cars each. Both already send two cars over the bridge. Would Fleet A send a third?',
      verdict: 'A third bridge car saves Fleet A 7 minutes and costs its own cars 8. Another 8 land on Fleet B and never enter the sum. Still a loss, so each fleet stops at two.',
      groups: [{ label: 'Fleet A · counted', n: 6, counted: true, glyph: 'dot' }, { label: 'Fleet B · not counted', n: 6, counted: false, glyph: 'diamond' }],
      countedLabel: 'Fleet A counts', countedFoot: 'Its own six cars only', meanTail: ', on average'
    },
    solo: {
      testHeadline: 'One driver takes a minute longer. Eleven others get home sooner.',
      index: 3, title: 'Twelve solo drivers', to: 'north', other: 'square', step: 15.5,
      cars: [{ f: 'a', r: 'bridge', mover: true }].concat(fill(11, 'b', 'bridge')),
      headline: 'Every driver takes the bridge—and everyone spends 53 minutes.',
      idle: 'Twelve drivers, each counting one trip. All twelve take the bridge and spend 53 minutes, 11 more than under one dispatcher. Could one of them do better by leaving?',
      verdict: 'Leaving costs this driver 1 minute and saves the other eleven 22 minutes combined. Nobody is counting the 22, so all twelve stay on the bridge.',
      groups: [{ label: 'This driver · counted', n: 1, counted: true, glyph: 'dot' }, { label: '11 others · not counted', n: 11, counted: false, glyph: 'square' }],
      countedLabel: 'This driver counts', countedFoot: 'One trip, their own', meanTail: ''
    }
  };
  var C = CASES[caseId] || CASES.one;
  var cars = C.cars;
  var mi = 0;

  function fmt(d) { return (d > 0 ? '+' : '−') + Math.abs(d); }
  function nCars(k) { return k + (k === 1 ? ' car' : ' cars'); }
  function r1(v) { return Math.round(v * 10) / 10; }

  function evaluate(routes) {
    var n = { north: 0, south: 0, bridge: 0 };
    routes.forEach(function (r) { n[r]++; });
    var k = { wn: n.north + n.bridge, ne: n.north, ws: n.south, se: n.south + n.bridge, ns: n.bridge };
    var t = { wn: 2 * k.wn, ne: 30, ws: 30, se: 2 * k.se, ns: 5 };
    var rt = { north: t.wn + t.ne, south: t.ws + t.se, bridge: t.wn + t.ns + t.se };
    return { n: n, k: k, t: t, rt: rt, min: routes.map(function (r) { return rt[r]; }) };
  }

  function vec(id) {
    var a = NODE[ROAD[id][0]], b = NODE[ROAD[id][1]];
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy);
    return { a: a, b: b, d: [dx / L, dy / L], n: [-dy / L, dx / L], L: L };
  }
  function rank(id, i, r) {
    var m = !!cars[i].mover, A = cars[i].f === 'a';
    if (id === 'wn') return m ? [1, 0] : (r === 'north' ? [0, A ? 1 : 0] : [2, A ? 0 : 1]);
    if (id === 'ns') return m ? [0, 0] : [1, A ? 0 : 1];
    if (id === 'se') return r === 'bridge' ? (m ? [0, 0] : [1, A ? 0 : 1]) : [2, A ? 0 : 1];
    if (id === 'ne') return m ? [1, 0] : [0, A ? 1 : 0];
    return [0, A ? 0 : 1];
  }
  function layout(routes) {
    var order = {}, off = {};
    Object.keys(ROAD).forEach(function (id) {
      var list = [];
      routes.forEach(function (r, i) { if (ROUTE[r].indexOf(id) >= 0) list.push(i); });
      list.sort(function (x, y) {
        var a = rank(id, x, routes[x]), b = rank(id, y, routes[y]);
        return a[0] - b[0] || a[1] - b[1] || x - y;
      });
      order[id] = list; off[id] = {};
      list.forEach(function (i, p) { off[id][i] = (p - (list.length - 1) / 2) * P; });
    });
    function at(id, a, o) { var v = vec(id); return [r1(v.a[0] + v.d[0] * a + v.n[0] * o), r1(v.a[1] + v.d[1] * a + v.n[1] * o)]; }
    var bead = routes.map(function (r, i) {
      var id = HOME[r], list = order[id], pos = list.indexOf(i), m = !!cars[i].mover, a;
      var hasMover = list.some(function (j) { return cars[j].mover; });
      if (id === 'ne') a = m ? 40 : 40 + 22 * (pos + 1);
      else if (id === 'ws') a = Math.max(48, (vec(id).L - 24 * (list.length - 1)) / 2) + 24 * pos;
      else a = 62 + C.step * (m ? 0 : pos - (hasMover ? 1 : 0) + 1);
      return at(id, a, off[id][i]);
    });
    var strand = routes.map(function (r, i) {
      return ROUTE[r].map(function (id) {
        var v = vec(id), o = off[id][i];
        return { id: id, p: [r1(v.a[0] + v.n[0] * o), r1(v.a[1] + v.n[1] * o)], q: [r1(v.b[0] + v.n[0] * o), r1(v.b[1] + v.n[1] * o)] };
      });
    });
    return { order: order, off: off, bead: bead, strand: strand };
  }
  function glyphOf(i) { return cars[i].f === 'a' ? 'dot' : C.other; }

  var routes0 = cars.map(function (c) { return c.r; });
  var routes1 = routes0.map(function (r, i) { return test && cars[i].mover ? C.to : r; });
  var S0 = evaluate(routes0), S1 = evaluate(routes1);
  var L0 = layout(routes0), L1 = layout(routes1);
  var delta = S1.min.map(function (m, i) { return m - S0.min[i]; });

  /* ---- roads, chevrons ---- */
  var roads = Object.keys(ROAD).map(function (id) {
    var v = vec(id), k = S1.k[id], dt = S1.t[id] - S0.t[id];
    return {
      id: id, kind: KIND[id], k: k, empty: k === 0, x1: v.a[0], y1: v.a[1], x2: v.b[0], y2: v.b[1],
      len: r1(v.L), deg: r1(Math.atan2(v.d[1], v.d[0]) * 180 / Math.PI),
      width: Math.max(k, 1) * P + 6, tone: dt > 0 ? 'cost' : dt < 0 ? 'save' : ''
    };
  });
  var chevrons = [];
  roads.forEach(function (rd) {
    if (!rd.empty) return;
    var v = vec(rd.id);
    [0.34, 0.5, 0.66].forEach(function (f) {
      chevrons.push({ x: r1(v.a[0] + v.d[0] * v.L * f), y: r1(v.a[1] + v.d[1] * v.L * f), deg: rd.deg, kind: rd.kind });
    });
  });

  /* ---- strands, beads, pills ---- */
  var strands = [], moverStrand = null, ghost = null, beads = [], pills = [], pop = 0;
  cars.forEach(function (c, i) {
    var s = { segs: L1.strand[i], counted: c.f === 'a', mover: !!c.mover };
    if (c.mover) moverStrand = s; else strands.push(s);
  });
  cars.forEach(function (c, i) {
    var b = L1.bead[i], g = glyphOf(i), counted = c.f === 'a';
    if (c.mover && test) {
      pills.push({ x: b[0], y: b[1], dir: 'e', text: fmt(delta[i]), tone: delta[i] > 0 ? 'cost' : 'save', counted: true, glyph: g, big: true, delay: 420 });
      beads.push({ x: b[0], y: b[1], glyph: g, counted: true, mover: true, halo: false });
    } else if (delta[i] !== 0) {
      pills.push({ x: b[0], y: b[1], dir: HOME[routes1[i]] === 'ws' ? 'w' : 'e', text: fmt(delta[i]), tone: delta[i] > 0 ? 'cost' : 'save', counted: counted, glyph: g, big: false, delay: 620 + 45 * pop++ });
      beads.push({ x: b[0], y: b[1], glyph: g, counted: counted, mover: false, halo: false });
    } else {
      beads.push({ x: b[0], y: b[1], glyph: g, counted: counted, mover: !!c.mover, halo: !!c.mover });
    }
  });
  if (test) {
    var gone = ROUTE[routes0[mi]].filter(function (id) { return ROUTE[routes1[mi]].indexOf(id) < 0; });
    ghost = { x: L0.bead[mi][0], y: L0.bead[mi][1], segs: L0.strand[mi].filter(function (s) { return gone.indexOf(s.id) >= 0; }) };
  }

  /* ---- labels ---- */
  var dse = S1.t.se - S0.t.se;
  var labels = {
    wn: ['W → N · 2k min', 'k = ' + S1.k.wn + ' · ' + S1.t.wn + ' min'],
    ne: ['N → E · 30 min', nCars(S1.k.ne) + ' · fixed'],
    ws: ['W → S · 30 min', nCars(S1.k.ws) + ' · fixed'],
    se: ['S → E · 2k min', 'k = ' + S1.k.se + ' · ' + S1.t.se + ' min'],
    seChip: dse ? fmt(dse) + ' min each' : '', seTone: dse > 0 ? 'cost' : dse < 0 ? 'save' : '',
    ns: ['BRIDGE', 'N → S', '5 min', nCars(S1.k.ns)]
  };

  /* ---- roster + tiles ---- */
  var cells = cars.map(function (c, i) {
    return {
      route: NAME[routes1[i]].charAt(0), moved: test && !!c.mover, min: S1.min[i], delta: delta[i] ? fmt(delta[i]) : '',
      tone: delta[i] > 0 ? 'cost' : delta[i] < 0 ? 'save' : '', counted: c.f === 'a', mover: !!c.mover,
      gap: i > 0 && cars[i - 1].f !== c.f
    };
  });
  function sum(arr, pick) { var s = 0; arr.forEach(function (v, i) { if (pick(i)) s += v; }); return s; }
  var isA = function (i) { return cars[i].f === 'a'; }, any = function () { return true; };
  var c0 = sum(S0.min, isA), c1 = sum(S1.min, isA), a0 = sum(S0.min, any), a1 = sum(S1.min, any);
  var unit = caseId === 'solo' ? 'min' : 'car-min';
  var paidA = delta.filter(function (d, i) { return i !== mi && isA(i) && d !== 0; });
  var paidB = delta.filter(function (d, i) { return !isA(i) && d !== 0; });
  var sumB = paidB.reduce(function (s, d) { return s + d; }, 0);
  var foot1 = fmt(delta[mi] || 0);
  if (paidA.length) foot1 += (paidA[0] > 0 ? ' + ' : ' − ') + paidA.length + '×' + Math.abs(paidA[0]);
  foot1 += c1 > c0 ? ' → declined' : ' → accepted';
  var foot2 = !paidB.length ? 'Same books, same answer'
    : sumB > 0 ? fmt(sumB) + ' more lands on Fleet B' : paidB.length + ' others would save ' + Math.abs(sumB);
  var tiles = {
    counted: {
      label: test ? C.countedLabel + ' · ' + unit : C.countedLabel, from: c0, to: c1, unit: unit, changed: test,
      delta: test ? fmt(c1 - c0) : '', tone: c1 > c0 ? 'cost' : 'save', foot: test ? foot1 : C.countedFoot
    },
    all: {
      label: test ? 'All 12 cars · car-min' : 'All 12 cars', from: a0, to: a1, unit: 'car-min', changed: test,
      delta: test ? fmt(a1 - a0) : '', tone: a1 > a0 ? 'cost' : 'save', foot: test ? foot2 : (a0 / 12) + ' min per car' + C.meanTail
    }
  };

  /* ---- routes table ---- */
  var routeRows = ['north', 'south', 'bridge'].map(function (r) {
    var note = '';
    if (S1.n[r] === 0 && r === 'bridge') note = (S1.rt.bridge + 2) + ' min once a car enters';
    else if (test && S1.rt[r] !== S0.rt[r]) note = 'was ' + S0.rt[r] + ' min';
    else if (test && S1.n[r] !== S0.n[r]) note = 'was ' + nCars(S0.n[r]);
    return { name: NAME[r], path: PATH[r], cars: nCars(S1.n[r]), min: S1.rt[r] + ' min', note: note, empty: S1.n[r] === 0 };
  });

  var from = NAME[routes0[mi]], to = NAME[C.to];
  var split = S1.n.north + ' / ' + S1.n.south + ' / ' + S1.n.bridge;
  var aria = C.title + (test ? ', testing one car moved from ' + from + ' to ' + to : ', settled') + '. ' +
    routeRows.map(function (r) { return r.name + ' route: ' + r.cars + ', ' + r.min; }).join('; ') + '.' +
    (test ? ' The decision-maker counts ' + fmt(c1 - c0) + ' ' + unit + '; all 12 cars change by ' + fmt(a1 - a0) + ' car-minutes.' : '');

  return {
    caseId: caseId, test: !!test, index: C.index, title: C.title, headline: test ? C.testHeadline : C.headline,
    blurb: test ? C.verdict : C.idle, moveLabel: from + ' → ' + to,
    button: test ? 'Put the car back' : 'Test: move one car ' + from + ' → ' + to,
    split: split, nodes: NODE, roads: roads, chevrons: chevrons, strands: strands, moverStrand: moverStrand, ghost: ghost,
    beads: beads, pills: pills, labels: labels, groups: C.groups, cells: cells, tiles: tiles, routeRows: routeRows,
    aria: aria, S0: S0, S1: S1, delta: delta
  };
}
