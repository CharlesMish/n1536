/** SAME RESIDUAL: Euclidean norms, fixed coordinates, r = b - A xhat. */
export const MATRIX = Object.freeze([Object.freeze([100, 0]), Object.freeze([0, 1])]);
export const RIGHT_HAND_SIDE = Object.freeze([100, 0]);
export const EXACT_SOLUTION = Object.freeze([1, 0]);
export const SINGULAR_VALUES = Object.freeze([100, 1]);
export const CONDITION_NUMBER = 100;
export const RESIDUAL_NORM = 1;
export const RELATIVE_RESIDUAL = 0.01;
export const DEFAULT_ANGLE = 45;

export function normalizeAngle(degrees) {
  if (!Number.isFinite(degrees)) throw new RangeError('Direction must be finite.');
  return ((degrees % 360) + 360) % 360;
}

/** Cardinal values are exact; other directions use ordinary floating-point trig. */
export function residualAt(degrees) {
  const angle = normalizeAngle(degrees);
  if (angle % 90 === 0) return [[1, 0], [0, 1], [-1, 0], [0, -1]][angle / 90].slice();
  const radians = angle * Math.PI / 180;
  return [Math.cos(radians), Math.sin(radians)];
}

export function stateAt(degrees) {
  const angle = normalizeAngle(degrees);
  const residual = residualAt(angle);
  const error = [residual[0] / MATRIX[0][0], residual[1] / MATRIX[1][1]];
  const approximate = EXACT_SOLUTION.map((value, i) => value - error[i]);
  const errorNorm = Math.hypot(...error);
  const relativeError = errorNorm / Math.hypot(...EXACT_SOLUTION);
  return {
    angle, residual, error, approximate, residualNorm: Math.hypot(...residual),
    errorNorm, relativeResidual: RELATIVE_RESIDUAL, relativeError,
    amplification: relativeError / RELATIVE_RESIDUAL,
    relativeErrorBound: CONDITION_NUMBER * RELATIVE_RESIDUAL,
  };
}

/** Equal-unit display locus: e1² / (0.01)² + e2² = 1. */
export function locus(samples = 360) {
  if (!Number.isInteger(samples) || samples < 4) throw new RangeError('At least four samples are required.');
  return Array.from({ length: samples + 1 }, (_, i) => stateAt(i * 360 / samples));
}
