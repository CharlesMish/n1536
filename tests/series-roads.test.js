import assert from 'node:assert/strict';
import test from 'node:test';
import { roadsModel } from '../public/series/assets/same-roads-model.js';

for (const [id, totals, costs, effects] of [
  ['one', [504, 505], [42, 42, 29], [-11, 12, 0]],
  ['two', [516, 525], [46, 46, 37], [-7, 8, 8]],
  ['solo', [636, 615], [54, 54, 53], [1, 0, -22]],
]) {
  test(`ROADS counts each car and its fleet’s share of a move: ${id}`, () => {
    for (const moving of [false, true]) {
      const m = roadsModel(id, moving);
      assert.deepEqual([m.S0.rt.north, m.S0.rt.south, m.S0.rt.bridge], costs);
      assert.equal(m.tiles.all.to, totals[Number(moving)]);
      assert.equal(m.cells.length, 12);
      assert.equal(m.tiles.counted.to - m.tiles.counted.from, Number(moving));
      const ledger = [0, 0, 0];
      for (const [i, car] of m.cells.entries()) ledger[car.mover ? 0 : car.counted ? 1 : 2] += m.delta[i];
      assert.deepEqual(ledger, moving ? effects : [0, 0, 0]);
    }
  });
}
