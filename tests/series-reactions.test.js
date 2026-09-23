import test from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from '../public/series/assets/same-reactions-model.js';

const close = (actual, expected, tolerance = 1e-11) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);

// Independent piecewise Green function for a unit load at v. It satisfies
// the supported-end displacement/moment conditions and the unit shear jump.
const green = (u, v) => u <= v ?
  (1 - v) * u * (1 - (1 - v) ** 2 - u ** 2) / 6 :
  v * (1 - u) * (1 - v ** 2 - (1 - u) ** 2) / 6;
const integrateCubic = (fn, lo, hi) => (hi - lo) * (fn(lo) + 4 * fn((lo + hi) / 2) + fn(hi)) / 6;

test('all allowed pair settings agree with independent point-load superposition and fixed bounds', () => {
  for (let i = 10; i <= 50; i++) {
    const a = i / 100;
    const model = specimen('pair', a);
    for (let j = 0; j <= 100; j++) {
      const u = j / 100;
      close(model.displacement(u), (green(u, a) + green(u, 1 - a)) / 2, 1e-15);
      close(model.moment(u), Math.min(u, a, 1 - u) / 2, 1e-15);
      close(model.displacement(u), model.displacement(1 - u), 1e-15);
      assert.ok(model.displacement(u) >= -1e-15 && model.displacement(u) <= model.midspanDisplacement + 1e-15);
      assert.ok(model.moment(u) >= -1e-15 && model.moment(u) <= model.peakMoment + 1e-15);
    }
    assert.ok(model.peakMoment <= 1 / 4 && model.midspanDisplacement <= 1 / 48);
  }
});

test('center and distributed loading agree with the independent Green function', () => {
  for (let j = 0; j <= 100; j++) {
    const u = j / 100;
    close(specimen('center').displacement(u), green(u, 0.5), 1e-15);
    // Split at the Green function's knot: Simpson is exact on each cubic.
    const expected = integrateCubic(v => green(u, v), 0, u) + integrateCubic(v => green(u, v), u, 1);
    close(specimen('uniform').displacement(u), expected, 1e-15);
  }
});

test('unknown cases and invalid paired positions are rejected', () => {
  assert.throws(() => specimen('unknown'), RangeError);
  for (const a of [NaN, Infinity, -Infinity, 0.09, 0.51, '0.25']) {
    assert.throws(() => specimen('pair', a), RangeError);
  }
});

test('all three load distributions have the same total and first moment', () => {
  for (const kind of ['center', 'pair', 'uniform']) {
    for (const a of [0.10, 0.25, 0.39, 0.50]) {
      const b = specimen(kind, a);
      close(b.totalLoad, 1);
      close(b.loadFirstMoment, 0.5);
      close(b.reactionLeft, 0.5);
      close(b.reactionRight, 0.5);
      close(b.moment(0), 0);
      close(b.moment(1), 0);
      close(b.displacement(0), 0);
      close(b.displacement(1), 0);
    }
  }
});

test('known closed-form reactions, moment and displacement checkpoints', () => {
  const center = specimen('center');
  const pair = specimen('pair', 0.25);
  const uniform = specimen('uniform');
  close(center.peakMoment, 1 / 4);
  close(center.displacement(0.5), 1 / 48);
  close(pair.moment(0.25), 1 / 8);
  close(pair.moment(0.5), 1 / 8);
  close(pair.moment(0.75), 1 / 8);
  close(pair.displacement(0.5), 11 / 768);
  close(uniform.moment(0.5), 1 / 8);
  close(uniform.displacement(0.5), 5 / 384);
  close(pair.displacement(0.5) / uniform.displacement(0.5), 1.1);
});

test('the integrated displacement has curvature minus moment away from concentrated loads', () => {
  const h = 1e-4;
  for (const b of [specimen('center'), specimen('pair', 0.25), specimen('pair', 0.39), specimen('uniform')]) {
    for (const u of [0.13, 0.32, 0.59, 0.83]) {
      const curvature = (b.displacement(u + h) - 2 * b.displacement(u) + b.displacement(u - h)) / (h * h);
      close(curvature, -b.moment(u), 2e-8);
    }
  }
});

test('coincident half-loads reproduce the centered point load throughout the span', () => {
  const combined = specimen('pair', 0.5);
  const center = specimen('center');
  for (let j = 0; j <= 100; j++) {
    const u = j / 100;
    close(combined.moment(u), center.moment(u));
    close(combined.displacement(u), center.displacement(u));
  }
});
