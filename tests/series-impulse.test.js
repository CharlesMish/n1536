import test from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM, SPACING, ALPHA, OMEGA_D, histories, appliedForce, accumulatedImpulse, response, residualAmplitude, peakDisplacement, freeState } from '../public/series/assets/same-impulse-model.js';

const near = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected} within ${tolerance}`);

// Independent Duhamel quadrature: no particular-solution coefficients or state transition from the production model.
function convolution(history, time, intervals = 12000) {
  const dt = time / intervals;
  let x = 0, v = 0;
  for (let i = 0; i <= intervals; i++) {
    const tau = dt * i, age = time - tau;
    const force = history.pulses.reduce((sum, p) => {
      const u = tau - p.start;
      return sum + (u > 0 && u < p.width ? p.impulse / p.width * (1 - Math.cos(2 * Math.PI * u / p.width)) : 0);
    }, 0);
    const coefficient = i === 0 || i === intervals ? 1 : i % 2 ? 4 : 2;
    const envelope = Math.exp(-ALPHA * age) / SYSTEM.m;
    x += coefficient * force * envelope * Math.sin(OMEGA_D * age) / OMEGA_D;
    v += coefficient * force * envelope * (Math.cos(OMEGA_D * age) - ALPHA / OMEGA_D * Math.sin(OMEGA_D * age));
  }
  return { x: x * dt / 3, v: v * dt / 3 };
}

test('each allowed force history has exactly one unit of applied impulse inside the fixed window', () => {
  for (const spacing of [SPACING.min, 0.91, 1, 1.43, 2, SPACING.max]) {
    for (const history of histories(spacing)) {
      near(history.pulses.reduce((sum, p) => sum + p.impulse, 0), 1, 0);
      near(accumulatedImpulse(history, -1), 0, 0);
      near(accumulatedImpulse(history, SYSTEM.window), 1, 1e-15);
      near(appliedForce(history, 0), 0, 0);
      near(appliedForce(history, 3), 0, 1e-14);
      const n = 12000, dt = 3 / n;
      let integral = 0;
      for (let i = 0; i <= n; i++) {
        const force = appliedForce(history, i * dt);
        assert.ok(force >= 0 && force <= 10 / 3 + 1e-12);
        integral += force * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
      }
      near(integral * dt / 3, 1, 1e-11);
      for (const pulse of history.pulses) assert.ok(pulse.start >= 0 && pulse.start + pulse.width <= 3 + 1e-12);
    }
  }
  assert.throws(() => histories(0.59), RangeError);
  assert.throws(() => histories(NaN), RangeError);
});

test('analytic pulse response agrees with independent impulse-response convolution during and after forcing', () => {
  for (const spacing of [0.6, 1, 1.37, 2.2]) {
    for (const history of histories(spacing)) {
      for (const time of [0.17, 0.51, 0.8, 1.4, 2.3, 3, 4.1, 8]) {
        const actual = response(history, time), expected = convolution(history, time);
        near(actual.x, expected.x, 3e-10);
        near(actual.v, expected.v, 3e-9);
      }
    }
  }
});

test('rest, pulse boundaries, and free evolution remain continuous and obey the equation', () => {
  const delta = 1e-5;
  for (const history of histories(1.13)) {
    assert.deepEqual(response(history, 0), { x: 0, v: 0 });
    for (const time of [0.51, 1.4, 2.31, 3.51]) {
      const before = response(history, time - delta), current = response(history, time), after = response(history, time + delta);
      near((after.x - before.x) / (2 * delta), current.v, 2e-9);
      near(SYSTEM.m * (after.v - before.v) / (2 * delta) + SYSTEM.c * current.v + SYSTEM.k * current.x, appliedForce(history, time), 2e-8);
    }
    for (const pulse of history.pulses) {
      for (const boundary of [pulse.start, pulse.start + pulse.width]) {
        const before = response(history, boundary - 1e-9), after = response(history, boundary + 1e-9);
        near(before.x, after.x, 2e-9); near(before.v, after.v, 5e-9);
      }
    }
    const end = response(history, 3);
    const later = freeState(end.x, end.v, 2.71), exact = response(history, 5.71);
    near(later.x, exact.x, 1e-14); near(later.v, exact.v, 1e-14);
  }
});

test('residual envelope and peak readouts are measured on the common clock and fit fixed axes', () => {
  for (const spacing of [0.6, 1, 1.37, 2, 2.2]) {
    for (const history of histories(spacing)) {
      const residual = residualAmplitude(history), peak = peakDisplacement(history);
      let sampledPeak = 0;
      for (let i = 0; i <= 8000; i++) {
        const time = i / 1000, state = response(history, time);
        sampledPeak = Math.max(sampledPeak, Math.abs(state.x));
        assert.ok(Math.abs(state.x) <= 0.36);
        if (time >= 3) assert.ok(Math.abs(state.x) <= residual * Math.exp(-ALPHA * (time - 3)) + 1e-14);
      }
      assert.ok(peak.magnitude >= sampledPeak - 1e-13);
      near(peak.magnitude, sampledPeak, 5e-7);
      near(Math.abs(response(history, peak.time).x), peak.magnitude, 1e-14);
      near(response(history, peak.time).v, 0, 1e-11);
    }
  }
  const quiet = residualAmplitude(histories(1)[2]), reinforced = residualAmplitude(histories(2)[2]);
  assert.ok(reinforced > quiet * 10, 'half-cycle and whole-cycle examples must substantiate the stated distinction');
  assert.ok(quiet > 0, 'damping prevents exact cancellation in this construction');
});
