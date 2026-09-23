import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../public/series/assets/same-sum-model.js';

const runs = M.ORDER_NAMES.map(M.runOrder);
const [given, ascending, descending] = runs;

// Independent byte decoder: no calls into the model's unit conversion helpers.
function exactInteger(x) {
  const bytes = Buffer.alloc(8); bytes.writeDoubleBE(x);
  const raw = bytes.readBigUInt64BE();
  const exponent = Number((raw >> 52n) & 2047n);
  const fraction = raw & ((1n << 52n) - 1n);
  const magnitude = exponent === 0 ? fraction : ((1n << 52n) | fraction) << BigInt(exponent - 1);
  return raw >> 63n ? -magnitude : magnitude;
}

test('one frozen multiset, three permutations of it', () => {
  assert.equal(M.VALUES.length, M.N);
  for (const run of runs) assert.deepEqual([...run.order].sort((a, b) => a - b), M.VALUES.map((_, i) => i));
  assert.equal(M.VALUES[M.LARGE_IN], -M.VALUES[M.LARGE_OUT]);
});

test('an independent BigInt oracle agrees with the grid ledger', () => {
  // Decode each double from its bytes, without the model's grid shortcut.
  const exact = M.VALUES.reduce((sum, x) => sum + exactInteger(x), 0n);
  assert.equal(exact, M.EXACT_UNITS << BigInt(1074 - M.GRID_BITS));
  assert.equal(M.unitsToDecimal(M.EXACT_UNITS), '7,919.23452281951904296875');
});

test('every step: a + b = fl(a + b) + TwoSum error, exactly', () => {
  for (const run of runs) {
    let rounded = 0n;
    for (let k = 1; k <= M.N; k += 1) {
      const a = exactInteger(run.acc[k - 1]), b = exactInteger(M.VALUES[run.order[k - 1]]);
      assert.equal(run.acc[k], run.acc[k - 1] + M.VALUES[run.order[k - 1]]);
      assert.equal(a + b, exactInteger(run.acc[k]) + exactInteger(run.shed[k]));
      rounded += M.toUnits(run.shed[k]);
    }
    assert.equal(run.computedUnits + rounded, M.EXACT_UNITS);
  }
});

test('the declared specimen: three different totals, one exact', () => {
  assert.equal(given.errorUnits, -670n);
  assert.equal(given.shedCount, 763);
  assert.deepEqual([given.largeInStep, given.largeOutStep], [385, 1153]);
  assert.equal(ascending.errorUnits, 101n);
  assert.equal(ascending.shedCount, 1);
  assert.deepEqual([ascending.largeInStep, ascending.largeOutStep], [1535, 1536]);
  assert.equal(descending.errorUnits, 0n);
  assert.equal(descending.shedCount, 0);
  assert.deepEqual([descending.largeInStep, descending.largeOutStep], [1, 2]);
});

test('every model check shown on the page passes', () => {
  for (const check of M.verify(runs)) assert.ok(check.pass, check.label);
});

test('exact decimal and bit helpers', () => {
  assert.equal(M.unitsToDecimal(-1n), '−0.00000095367431640625');
  assert.equal(M.unitsToDecimal(3n << 20n), '3');
  assert.deepEqual([...M.unitBits(-5n, 4)], [1, 0, 1, 0]);
  assert.equal(M.windowFloor(M.LARGE), 40 - 52 + M.GRID_BITS);
  assert.equal(M.nextAfter(1, 1), 1 + Number.EPSILON);
  assert.equal(M.nextAfter(1, -1), 1 - Number.EPSILON / 2);
});


test('signed corrections include upward rounding and every drift stays on the fixed axes', () => {
  assert.equal([...given.shed].filter(e => e < 0).length, 380);
  assert.equal(ascending.shed[1535], -101 * 2 ** -20);
  for (const run of runs) for (let k = 0; k <= M.N; k++) {
    assert.ok(Math.abs(run.drift[k]) < .0021);
    if (k > 0) {
      const exact = exactInteger(run.acc[k - 1]) + exactInteger(M.VALUES[run.order[k - 1]]);
      const stored = exactInteger(run.acc[k]);
      assert.equal(Math.sign(run.shed[k]), exact > stored ? 1 : exact < stored ? -1 : 0);
    }
  }
});
