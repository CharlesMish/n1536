import test from 'node:test';
import assert from 'node:assert/strict';
import { EIGENVALUES, INITIAL_STATE, END_TIME, matrix, stateAt, derivativeAt, normAt, peakForInitial, trajectory } from '../public/series/assets/same-eigenvalues-model.js';

const close = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);

test('every coupling retains the eigenvalues, characteristic polynomial, and initial vector', () => {
  assert.deepEqual(EIGENVALUES, [-1, -2]);
  for (let k = 0; k <= 12; k += 0.1) {
    const [[a, b], [c, d]] = matrix(k);
    close(a + d, -3);
    close(a * d - b * c, 2);
    for (const lambda of EIGENVALUES) close((a - lambda) * (d - lambda) - b * c, 0);
    const start = stateAt(k, 0);
    start.forEach((value, i) => close(value, INITIAL_STATE[i]));
    close(normAt(k, 0), 1);
  }
});

test('exact trajectories satisfy xdot=Ax and the uncoupled exponential', () => {
  for (const k of [0, 0.1, 2, 4, 8, 12]) {
    for (const t of [0.001, 0.2, 0.7, 1, 3, 6]) {
      const step = 1e-5;
      const lower = stateAt(k, t - step);
      const upper = stateAt(k, t + step);
      const derivative = derivativeAt(k, t);
      derivative.forEach((value, i) => close((upper[i] - lower[i]) / (2 * step), value, 3e-8));
      close(stateAt(k, t)[1], Math.exp(-2 * t));
    }
  }
  for (const t of [0, 0.001, 0.4, 3, 6, 50]) {
    close(stateAt(0, t)[0], 0);
    close(normAt(0, t), Math.exp(-2 * t));
  }
  close(stateAt(12, Math.log(2))[0], 3);
  close(stateAt(12, Math.log(2))[1], 0.25);
});

test('analytic global peak dominates a dense time sweep and satisfies stationarity', () => {
  for (const k of [0, 0.1, 2, Math.sqrt(8), 2.9, 3, 3.5, 4, 6, 8, 12]) {
    const peak = peakForInitial(k);
    close(peak.norm, normAt(k, peak.time));
    assert.ok(peak.norm >= 1);
    for (let i = 0; i <= 10000; i++) assert.ok(normAt(k, i / 1000) <= peak.norm + 1e-12);
    if (peak.time > 0) {
      const state = stateAt(k, peak.time), rate = derivativeAt(k, peak.time);
      close(state[0] * rate[0] + state[1] * rate[1], 0, 2e-12);
    }
  }
  assert.deepEqual(peakForInitial(0), { time: 0, norm: 1 });
  assert.deepEqual(peakForInitial(Math.sqrt(8)), { time: 0, norm: 1 });
  assert.ok(peakForInitial(4).norm > 1);
  assert.ok(peakForInitial(12).norm > 3);
});

test('fixed initial direction first contracts and all bounded couplings tend toward zero', () => {
  for (const k of [0, 4, 12]) {
    const start = stateAt(k, 0), rate = derivativeAt(k, 0);
    close(start[0] * rate[0] + start[1] * rate[1], -2);
    assert.ok(normAt(k, 1e-6) < 1);
    assert.ok(normAt(k, 50) < 3e-21);
    assert.deepEqual(stateAt(k, 1000), [0, 0]);
  }
});

test('display samples retain fixed time window, equal-unit bounds, and exact values', () => {
  for (const k of [0, 4, 12]) {
    const points = trajectory(k);
    assert.equal(points.length, 361);
    assert.equal(points[0].time, 0);
    assert.equal(points.at(-1).time, END_TIME);
    for (const point of points) {
      assert.deepEqual(point.state, stateAt(k, point.time));
      close(point.norm, Math.hypot(...point.state));
      assert.ok(point.state[0] >= 0 && point.state[0] <= 3);
      assert.ok(point.state[1] >= 0 && point.state[1] <= 1);
      assert.ok(point.norm <= 3.5);
    }
  }
});

test('model rejects states outside its declared contract', () => {
  for (const k of [-1, 12.1, NaN, Infinity]) assert.throws(() => stateAt(k, 1), RangeError);
  for (const t of [-1, NaN, Infinity]) assert.throws(() => stateAt(4, t), RangeError);
  for (const count of [0, 1.5, Infinity]) assert.throws(() => trajectory(4, 6, count), RangeError);
});
