import test from 'node:test';
import assert from 'node:assert/strict';
import { MATRIX, RIGHT_HAND_SIDE, EXACT_SOLUTION, SINGULAR_VALUES, CONDITION_NUMBER, RESIDUAL_NORM, RELATIVE_RESIDUAL, DEFAULT_ANGLE, normalizeAngle, residualAt, stateAt, locus } from '../public/series/assets/same-residual-model.js';

const close = (a, b, tolerance = 2e-12) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
const norm = vector => Math.hypot(...vector);
const multiply = (matrix, vector) => matrix.map(row => row.reduce((sum, value, i) => sum + value * vector[i], 0));

test('the single fixed equation and its 2-norm condition number agree', () => {
  assert.deepEqual(multiply(MATRIX, EXACT_SOLUTION), RIGHT_HAND_SIDE);
  assert.deepEqual(SINGULAR_VALUES, [100, 1]);
  // A^T A is diagonal, so these are its positive square-root eigenvalues.
  close(SINGULAR_VALUES[0] ** 2, MATRIX[0][0] ** 2);
  close(SINGULAR_VALUES[1] ** 2, MATRIX[1][1] ** 2);
  close(CONDITION_NUMBER, SINGULAR_VALUES[0] / SINGULAR_VALUES[1]);
  close(RELATIVE_RESIDUAL, RESIDUAL_NORM / norm(RIGHT_HAND_SIDE));
});

test('every direction reconstructs r = b - A xhat and error = x - xhat', () => {
  for (let angle = 0; angle < 360; angle += 0.25) {
    const state = stateAt(angle);
    const rhs = multiply(MATRIX, state.approximate);
    const mappedError = multiply(MATRIX, state.error);
    state.residual.forEach((value, i) => {
      close(value, RIGHT_HAND_SIDE[i] - rhs[i], 3e-14);
      close(mappedError[i], value);
      close(state.error[i], EXACT_SOLUTION[i] - state.approximate[i]);
    });
    close(norm(state.residual), 1);
    close(state.residualNorm, 1);
    close(state.relativeResidual, 0.01);
    close(state.errorNorm, norm(state.error));
    close(state.relativeError, state.errorNorm / norm(EXACT_SOLUTION));
    close(state.amplification, state.relativeError / state.relativeResidual);
  }
});

test('the circle maps to the exact equal-unit ellipse and obeys the bound', () => {
  for (const state of locus(1440)) {
    close((state.error[0] / 0.01) ** 2 + state.error[1] ** 2, 1);
    assert.ok(state.errorNorm >= 0.01 - 1e-12 && state.errorNorm <= 1 + 1e-12);
    assert.ok(state.amplification >= 1 - 1e-12 && state.amplification <= CONDITION_NUMBER + 1e-12);
    assert.ok(state.relativeError <= state.relativeErrorBound + 1e-12);
    close(state.relativeErrorBound, 1);
  }
});

test('cardinal directions attain both extrema and diagonal agrees with closed form', () => {
  for (const angle of [0, 180, 360, -180]) {
    const state = stateAt(angle);
    close(state.errorNorm, 0.01);
    close(state.relativeError, 0.01);
    close(state.amplification, 1);
  }
  for (const angle of [90, 270, -90, 450]) {
    const state = stateAt(angle);
    close(state.errorNorm, 1);
    close(state.amplification, 100);
    close(state.relativeError, state.relativeErrorBound);
  }
  const diagonal = stateAt(DEFAULT_ANGLE);
  close(diagonal.errorNorm, Math.sqrt(0.50005));
  close(diagonal.amplification, Math.sqrt(5000.5));
  assert.deepEqual(stateAt(0).approximate, [0.99, 0]);
  assert.deepEqual(stateAt(90).approximate, [1, -1]);
  assert.deepEqual(residualAt(270), [0, -1]);
});

test('direction is periodic and finite while locus endpoints coincide', () => {
  close(normalizeAngle(-405), 315);
  for (const angle of [12.25, 39.5, 110, 230, 359.75]) {
    assert.deepEqual(stateAt(angle), stateAt(angle + 720));
  }
  const points = locus();
  assert.equal(points.length, 361);
  assert.deepEqual(points[0], points.at(-1));
  for (const angle of [Infinity, -Infinity, NaN]) assert.throws(() => stateAt(angle), RangeError);
  for (const count of [0, 3, 4.2, Infinity]) assert.throws(() => locus(count), RangeError);
});
