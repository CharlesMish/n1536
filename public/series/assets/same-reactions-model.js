// SAME REACTIONS · dimensionless simply supported Euler–Bernoulli beam.
// u = x/L, m = M/(WL), d = downward displacement / (WL^3/EI).
// W > 0, L > 0, EI > 0 are shared by every specimen.
export const PAIR_DEFAULT = 0.25;
export const PAIR_MIN = 0.10;
export const PAIR_MAX = 0.50;

const positive = value => Math.max(0, value);

export function specimen(kind, a = PAIR_DEFAULT) {
  if (!['center', 'pair', 'uniform'].includes(kind)) throw new RangeError('Unknown load arrangement');
  if (!Number.isFinite(a) || a < PAIR_MIN || a > PAIR_MAX) throw new RangeError('a/L out of range');

  const pointLoads = kind === 'center' ? [{ u: 0.5, share: 1 }] :
    kind === 'pair' ? [{ u: a, share: 0.5 }, { u: 1 - a, share: 0.5 }] : [];
  const uniformRate = kind === 'uniform' ? 1 : 0;
  const reactionLeft = 0.5;
  const reactionRight = 0.5;

  // m(u) = R_A u − Σ P_i(u − u_i)_+ − q u²/2.
  function moment(u) {
    const loads = pointLoads.reduce((total, load) => total + load.share * positive(u - load.u), 0);
    return reactionLeft * u - loads - uniformRate * u * u / 2;
  }

  // d''(u) = −m(u); the integration constant enforces d(0) = d(1) = 0.
  // Point-load terms integrate twice to (u − u_i)_+³ / 6.
  const integrationConstant = reactionLeft / 6 -
    pointLoads.reduce((total, load) => total + load.share * (1 - load.u) ** 3 / 6, 0) -
    uniformRate / 24;
  function displacement(u) {
    const loads = pointLoads.reduce((total, load) => total + load.share * positive(u - load.u) ** 3 / 6, 0);
    return integrationConstant * u - reactionLeft * u ** 3 / 6 + loads + uniformRate * u ** 4 / 24;
  }

  const peakMoment = kind === 'center' ? 1 / 4 : kind === 'uniform' ? 1 / 8 : a / 2;
  const midspanDisplacement = kind === 'center' ? 1 / 48 :
    kind === 'uniform' ? 5 / 384 : a * (3 - 4 * a * a) / 48;

  return {
    kind, a, pointLoads, uniformRate, reactionLeft, reactionRight,
    totalLoad: pointLoads.reduce((sum, load) => sum + load.share, 0) + uniformRate,
    loadFirstMoment: pointLoads.reduce((sum, load) => sum + load.share * load.u, 0) + uniformRate / 2,
    peakMoment, midspanDisplacement, moment, displacement,
  };
}
