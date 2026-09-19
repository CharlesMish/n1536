/** SAME EIGENVALUES: fixed coordinates, x(0)=(0,1), Euclidean norm. */
export const MAX_COUPLING = 12;
export const END_TIME = 6;
export const EIGENVALUES = Object.freeze([-1, -2]);
export const INITIAL_STATE = Object.freeze([0, 1]);

function validate(k, t = 0) {
  if (!Number.isFinite(k) || k < 0 || k > MAX_COUPLING) throw new RangeError('Coupling must be in [0, 12].');
  if (!Number.isFinite(t) || t < 0) throw new RangeError('Time must be finite and nonnegative.');
}

export function matrix(k) {
  validate(k);
  return [[-1, k], [0, -2]];
}

/** Closed-form solution; expm1 avoids cancellation close to t=0. */
export function stateAt(k, t) {
  validate(k, t);
  const a = Math.exp(-t);
  return [-k * a * Math.expm1(-t), a * a];
}

export function derivativeAt(k, t) {
  const [x, y] = stateAt(k, t);
  return [-x + k * y, -2 * y];
}

export function normAt(k, t) {
  return Math.hypot(...stateAt(k, t));
}

/** Global maximum over t>=0 for this single initial vector, not operator gain.
 * With r=exp(-t), ||x||²=k²r²-2k²r³+(k²+1)r⁴. Include both
 * interior stationary candidates and t=0; the limiting value at infinity is 0.
 */
export function peakForInitial(k) {
  validate(k);
  const a = k * k;
  let best = { time: 0, norm: 1 };
  if (a < 8) return best;
  const discriminant = Math.sqrt(a * (a - 8));
  for (const sign of [-1, 1]) {
    const r = (3 * a + sign * discriminant) / (4 * (a + 1));
    if (!(r > 0 && r <= 1)) continue;
    const time = -Math.log(r);
    const norm = normAt(k, time);
    if (norm > best.norm) best = { time, norm };
  }
  return best;
}

export function trajectory(k, end = END_TIME, samples = 360) {
  validate(k, end);
  if (!Number.isInteger(samples) || samples < 1) throw new RangeError('Samples must be a positive integer.');
  return Array.from({ length: samples + 1 }, (_, i) => {
    const time = end * i / samples;
    const state = stateAt(k, time);
    return { time, state, norm: Math.hypot(...state) };
  });
}
