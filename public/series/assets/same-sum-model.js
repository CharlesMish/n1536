/**
 * SAME SUM — one multiset of 1,536 binary64 values, three orders of addition.
 *
 * Every stored value is a multiple of the declared grid 2^-20, so each value,
 * each partial sum and each rounding error is an exact BigInt count of grid
 * units. Floating-point addition uses the ordinary JavaScript Number, which
 * ECMAScript defines as IEEE 754 binary64 with round-to-nearest, ties-to-even.
 */
export const N = 1536;
export const GRID_BITS = 20;            // grid = 2^-20
export const SEED = 4217;
export const LARGE = (1 + Math.sqrt(5)) / 2 * 2 ** 40; // binary64 nearest to φ · 2^40 (as evaluated)
export const LARGE_IN = 384;            // stored index of +LARGE
export const LARGE_OUT = 1152;          // stored index of −LARGE
export const MODERATE_RANGE = Object.freeze([-6, 9]); // log2 magnitudes of moderate values
export const ORDER_NAMES = Object.freeze(['given', 'ascending', 'descending']);

const SCALE = 2 ** GRID_BITS;
const BIG_SCALE = 1n << BigInt(GRID_BITS);

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The frozen multiset, in its stored (given) order. */
export const VALUES = (() => {
  const random = mulberry32(SEED);
  const values = [];
  const [lo, hi] = MODERATE_RANGE;
  while (values.length < N - 2) {
    const sign = random() < 0.5 ? -1 : 1;
    const magnitude = 2 ** (lo + (hi - lo) * random());
    const units = Math.round(magnitude * SCALE);   // quantize to the 2^-20 grid
    if (units !== 0) values.push(sign * units / SCALE);
  }
  values.splice(LARGE_IN, 0, LARGE);
  values.splice(LARGE_OUT, 0, -LARGE);
  return Object.freeze(values);
})();

/** Exact grid-unit count of a binary64 value; throws if it is off the grid. */
export function toUnits(x) {
  if (!Number.isFinite(x)) throw new RangeError('Finite values only.');
  const scaled = x * SCALE;                       // exact: multiplication by a power of two
  if (!Number.isInteger(scaled)) throw new RangeError(`${x} is not a multiple of 2^-${GRID_BITS}.`);
  return BigInt(scaled);
}

const FINE_BITS = 1100; // covers every finite binary64, including subnormals

/** Exact x · 2^bits as a BigInt, from the binary64 fields. */
export function toScaled(x, bits) {
  if (!Number.isFinite(x)) throw new RangeError('Finite values only.');
  if (x === 0) return 0n;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const raw = view.getBigUint64(0);
  const biased = Number((raw >> 52n) & 0x7ffn);
  let significand = raw & ((1n << 52n) - 1n);
  let exponent = biased - 1075;              // value = significand · 2^exponent
  if (biased === 0) exponent = -1074; else significand |= 1n << 52n;
  const shift = exponent + bits;
  let magnitude;
  if (shift >= 0) magnitude = significand << BigInt(shift);
  else {
    const drop = BigInt(-shift);
    if (significand & ((1n << drop) - 1n)) throw new RangeError(`${x} needs more than ${bits} fractional bits.`);
    magnitude = significand >> drop;
  }
  return raw >> 63n ? -magnitude : magnitude;
}

/** Knuth's TwoSum: s = fl(a + b) and the exact error e with a + b = s + e. */
export function twoSum(a, b) {
  const s = a + b;
  const bb = s - a;
  const e = (a - (s - bb)) + (b - bb);
  return [s, e];
}

/** Unbiased binary exponent of a nonzero normal double (floor(log2|x|)). */
export function exponentOf(x) {
  if (x === 0) return -Infinity;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  const biased = (view.getUint16(0) >> 4) & 0x7ff;
  if (biased === 0) throw new RangeError('Subnormals are outside this specimen.');
  return biased - 1023;
}

/** Adjacent binary64 in the given direction (finite, nonzero neighbours only here). */
export function nextAfter(x, direction) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  let bits = view.getBigUint64(0);
  if (x === 0) return direction > 0 ? Number.MIN_VALUE : -Number.MIN_VALUE;
  bits += (x > 0) === (direction > 0) ? 1n : -1n;
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}

export function isEvenSignificand(x) {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  return (view.getBigUint64(0) & 1n) === 0n;
}

/** Stable orders. Ties in |x| keep stored order, so +LARGE precedes −LARGE. */
export const ORDERS = (() => {
  const given = VALUES.map((_, i) => i);
  const byMagnitude = direction => [...given].sort((i, j) =>
    direction * (Math.abs(VALUES[i]) - Math.abs(VALUES[j])) || i - j);
  return Object.freeze({
    given: Object.freeze(given),
    ascending: Object.freeze(byMagnitude(1)),
    descending: Object.freeze(byMagnitude(-1)),
  });
})();

export const EXACT_UNITS = VALUES.reduce((sum, x) => sum + toUnits(x), 0n);

/** Run one order. Arrays have length N + 1 (step 0 is the empty accumulator). */
export function runOrder(name) {
  const order = ORDERS[name];
  if (!order) throw new RangeError(`Unknown order ${name}.`);
  const acc = new Float64Array(N + 1);
  const shed = new Float64Array(N + 1);           // rounding error of step k (a + b − s)
  const exactUnits = new Array(N + 1);
  const drift = new Float64Array(N + 1);          // computed − exact partial sum
  exactUnits[0] = 0n;
  let shedCount = 0, largeInStep = -1, largeOutStep = -1;
  for (let k = 1; k <= N; k += 1) {
    const index = order[k - 1];
    const [s, e] = twoSum(acc[k - 1], VALUES[index]);
    acc[k] = s; shed[k] = e;
    exactUnits[k] = exactUnits[k - 1] + toUnits(VALUES[index]);
    drift[k] = Number(toUnits(s) - exactUnits[k]) / SCALE;
    if (e !== 0) shedCount += 1;
    if (index === LARGE_IN) largeInStep = k;
    if (index === LARGE_OUT) largeOutStep = k;
  }
  const computedUnits = toUnits(acc[N]);
  return Object.freeze({
    name, order, acc, shed, exactUnits, drift, shedCount, largeInStep, largeOutStep,
    computed: acc[N], computedUnits, errorUnits: computedUnits - EXACT_UNITS,
  });
}

/** Exact decimal expansion of a grid-unit count (every dyadic has one). */
export function unitsToDecimal(units) {
  const negative = units < 0n;
  let magnitude = negative ? -units : units;
  const whole = magnitude / BIG_SCALE;
  let fraction = magnitude % BIG_SCALE;
  // fraction / 2^20 = fraction · 5^20 / 10^20
  let digits = (fraction * 5n ** BigInt(GRID_BITS)).toString().padStart(GRID_BITS, '0').replace(/0+$/, '');
  const text = whole.toLocaleString('en-US') + (digits ? `.${digits}` : '');
  return (negative ? '−' : '') + text;
}

/** Signed magnitude bits of a grid-unit count, LSB (2^-20) first. */
export function unitBits(units, width) {
  let magnitude = units < 0n ? -units : units;
  const bits = new Uint8Array(width);
  for (let i = 0; i < width && magnitude > 0n; i += 1) { bits[i] = Number(magnitude & 1n); magnitude >>= 1n; }
  return bits;
}

/** Position (in grid bits) of the lowest bit a stored result can keep. */
export function windowFloor(result) {
  if (result === 0) return null;
  return exponentOf(result) - 52 + GRID_BITS;
}

/** Numerical checks shown in the study and repeated by the unit tests. */
export function verify(runs = ORDER_NAMES.map(runOrder)) {
  const checks = [];
  const add = (label, pass) => checks.push({ label, pass: Boolean(pass) });
  add(`${N.toLocaleString('en-US')} values, one multiset: each order is a permutation of the stored indices`,
    runs.every(run => [...run.order].sort((a, b) => a - b).every((v, i) => v === i)));
  add('Every value is a finite, normal binary64 on the 2⁻²⁰ grid',
    VALUES.every(x => { try { toUnits(x); exponentOf(x); return true; } catch { return false; } }));
  add('The large pair cancels exactly: +L + (−L) = 0',
    toUnits(VALUES[LARGE_IN]) + toUnits(VALUES[LARGE_OUT]) === 0n);
  let perStep = true, ledger = true;
  for (const run of runs) {
    let shedUnits = 0n;
    for (let k = 1; k <= N; k += 1) {
      const a = toUnits(run.acc[k - 1]), b = toUnits(VALUES[run.order[k - 1]]), s = toUnits(run.acc[k]);
      const e = toUnits(run.shed[k]);
      if (a + b !== s + e) perStep = false;
      shedUnits += e;
    }
    if (run.computedUnits + shedUnits !== EXACT_UNITS) ledger = false;
  }
  add(`TwoSum error equals the BigInt difference at every step (${(3 * N).toLocaleString('en-US')} additions)`, perStep);
  add('For each order, computed total + sum of signed rounding corrections = exact total', ledger);
  add('Each stored result is the nearest binary64 to the exact a + b, ties to even', runs.every(run => {
    for (let k = 1; k <= N; k += 1) {
      // Neighbours can be finer than the grid, so compare at scale 2^FINE_BITS.
      const lift = 1n << BigInt(FINE_BITS - GRID_BITS);
      const exact = (toUnits(run.acc[k - 1]) + toUnits(VALUES[run.order[k - 1]])) * lift;
      const s = run.acc[k], d = exact - toScaled(s, FINE_BITS), gap = d < 0n ? -d : d;
      for (const neighbor of [nextAfter(s, 1), nextAfter(s, -1)]) {
        const nd = exact - toScaled(neighbor, FINE_BITS), ngap = nd < 0n ? -nd : nd;
        if (ngap < gap) return false;
        if (ngap === gap && gap !== 0n && !isEvenSignificand(s)) return false;
      }
    }
    return true;
  }));
  add('Whenever the accumulator does not hold L, the exact running total is below 2²⁰ in magnitude',
    runs.every(run => run.exactUnits.every((units, k) => {
      const holding = k >= run.largeInStep && k < run.largeOutStep;
      const magnitude = units < 0n ? -units : units;
      return holding || magnitude < 1n << BigInt(20 + GRID_BITS);
    })));
  add('Additions made without L in the accumulator never round',
    runs.every(run => { for (let k = 1; k <= N; k += 1) {
      const holding = k > run.largeInStep && k <= run.largeOutStep;
      if (!holding && k !== run.largeInStep && run.shed[k] !== 0) return false;
    } return true; }));
  const totals = new Set(runs.map(run => run.computedUnits.toString()));
  add('The three orders return three different totals', totals.size === 3);
  return checks;
}
