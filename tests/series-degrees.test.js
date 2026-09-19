import assert from 'node:assert/strict';
import test from 'node:test';
import { GRAPHS, VERTEX_COUNT, LABELS, POSITIONS, adjacency, distances, components, cutEdges, reachAt } from '../public/series/assets/same-degrees-math.js';

// Enumerate every nontrivial undirected cut, fixing vertex 11 to one side.
function exhaustiveMinimumCut(edges) {
  let smallest = Infinity;
  for (let mask = 1; mask < 1 << 11; mask++) {
    let count = 0;
    for (const [u, v] of edges) if (!!(mask & (1 << u)) !== !!(mask & (1 << v))) count++;
    smallest = Math.min(smallest, count);
  }
  return smallest;
}
for (const graph of GRAPHS) {
  test(`${graph.name}: exact simple cubic graph on the same twelve labeled vertices`, () => {
    assert.equal(VERTEX_COUNT, 12);
    assert.equal(LABELS.join(''), 'ABCDEFGHIJKL');
    assert.equal(graph.edges.length, 18);
    assert.equal(new Set(graph.edges.map(edge => edge.join(','))).size, 18);
    for (const [u, v] of graph.edges) {
      assert.ok(Number.isInteger(u) && Number.isInteger(v) && u >= 0 && v < 12 && u < v);
    }
    assert.deepEqual(adjacency(graph.edges).map(list => list.length), Array(12).fill(3));
    for (let source = 0; source < 12; source++) {
      assert.equal(reachAt(graph.edges, source, 0).reached, 1);
      assert.equal(reachAt(graph.edges, source, 1).reached, 4);
    }
  });
  test(`${graph.name}: BFS agrees with independent exhaustive walk reachability from every source`, () => {
    for (let source = 0; source < 12; source++) {
      const ds = distances(graph.edges, source);
      let accumulated = new Set([source]);
      for (let hop = 0; hop <= 12; hop++) {
        assert.deepEqual(ds.map((d, i) => d <= hop ? i : -1).filter(i => i >= 0), [...accumulated].sort((a, b) => a - b));
        const next = new Set(accumulated);
        for (const [u, v] of graph.edges) {
          if (accumulated.has(u)) next.add(v);
          if (accumulated.has(v)) next.add(u);
        }
        accumulated = next;
        const r = reachAt(graph.edges, source, hop);
        assert.equal(r.reached + r.waiting + r.unreachable, 12);
      }
      for (let target = 0; target < 12; target++) assert.equal(ds[target], distances(graph.edges, target)[source]);
    }
  });
  test(`${graph.name}: drawn edges do not pass through unrelated vertex discs`, () => {
    for (const [u, v] of graph.edges) for (let k = 0; k < 12; k++) {
      if (k === u || k === v) continue;
      const [a, b] = POSITIONS[u], [c, d] = POSITIONS[v], [x, y] = POSITIONS[k];
      const t = Math.max(0, Math.min(1, ((x - a) * (c - a) + (y - b) * (d - b)) / ((c - a) ** 2 + (d - b) ** 2)));
      assert.ok(Math.hypot(x - a - t * (c - a), y - b - t * (d - b)) > 24, `${u}–${v} must clear vertex ${k}'s disc and halo`);
    }
  });
}
test('cross-ring edge counts and global minimum cuts match the declared constructions', () => {
  const ring = [0, 1, 2, 3, 4, 5];
  assert.deepEqual(GRAPHS.map(g => cutEdges(g.edges, ring).length), [6, 2, 0]);
  assert.deepEqual(GRAPHS.map(g => exhaustiveMinimumCut(g.edges)), [3, 2, 0]);
  assert.deepEqual(GRAPHS.map(g => components(g.edges).map(c => c.length)), [[12], [12], [6, 6]]);
  const narrow = GRAPHS[1];
  assert.deepEqual(cutEdges(narrow.edges, ring), [[2, 8], [5, 11]]);
  const severed = narrow.edges.filter(([u, v]) => !((u === 2 && v === 8) || (u === 5 && v === 11)));
  assert.deepEqual(components(severed).map(c => c.length), [6, 6]);
});
test('the computed plate values follow the kernel at source A and hop 2', () => {
  assert.deepEqual(GRAPHS.map(g => reachAt(g.edges, 0, 2).reached), [8, 7, 6]);
  assert.deepEqual(GRAPHS.map(g => reachAt(g.edges, 0, 2).unreachable), [0, 0, 6]);
  assert.deepEqual(GRAPHS.map(g => reachAt(g.edges, 0, 100).reached), [12, 12, 6]);
});
test('invalid source IDs do not silently generate a graph result', () => {
  for (const source of [-1, 12, 1.2, NaN]) assert.throws(() => distances(GRAPHS[0].edges, source), RangeError);
});
