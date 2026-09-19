/** Exact unweighted graph constructions for SAME DEGREES. Vertex IDs persist. */
export const VERTEX_COUNT = 12;
export const LABELS = Object.freeze(Array.from({ length: VERTEX_COUNT }, (_, i) => String.fromCharCode(65 + i)));
const cycle = (n, offset = 0) => Array.from({ length: n }, (_, i) => [offset + i, offset + (i + 1) % n]);
const prism = offset => [...cycle(3, offset), ...cycle(3, offset + 3), ...Array.from({ length: 3 }, (_, i) => [offset + i, offset + i + 3])];
const apart = [...prism(0), ...prism(6)];
const freezeEdges = edges => Object.freeze(edges.map(([u, v]) => Object.freeze([Math.min(u, v), Math.max(u, v)])).sort(([a, b], [c, d]) => a - c || b - d));
export const GRAPHS = Object.freeze([
  Object.freeze({ id: 'spread', name: 'Spread', description: 'Six links join the two rings.', edges: freezeEdges([...cycle(6), ...cycle(6, 6), ...Array.from({ length: 6 }, (_, i) => [i, i + 6])]) }),
  Object.freeze({ id: 'narrow', name: 'Narrow', description: 'Two links join the two rings.', edges: freezeEdges([...apart.filter(([u, v]) => !((u === 2 && v === 5) || (u === 8 && v === 11))), [2, 8], [5, 11]]) }),
  Object.freeze({ id: 'apart', name: 'Apart', description: 'No link joins the two rings.', edges: freezeEdges(apart) }),
]);
export function adjacency(edges, count = VERTEX_COUNT) {
  const lists = Array.from({ length: count }, () => []);
  for (const [u, v] of edges) { lists[u].push(v); lists[v].push(u); }
  return lists.map(neighbors => neighbors.sort((a, b) => a - b));
}
export function distances(edges, source, count = VERTEX_COUNT) {
  if (!Number.isInteger(source) || source < 0 || source >= count) throw new RangeError('Source must be a vertex ID.');
  const neighbors = adjacency(edges, count), result = Array(count).fill(Infinity), queue = [source];
  result[source] = 0;
  for (let head = 0; head < queue.length; head++) for (const v of neighbors[queue[head]]) {
    if (result[v] !== Infinity) continue;
    result[v] = result[queue[head]] + 1;
    queue.push(v);
  }
  return result;
}
export function components(edges, count = VERTEX_COUNT) {
  const unseen = new Set(Array.from({ length: count }, (_, i) => i)), groups = [];
  while (unseen.size) {
    const ds = distances(edges, unseen.values().next().value, count), group = [];
    ds.forEach((distance, vertex) => { if (Number.isFinite(distance)) { group.push(vertex); unseen.delete(vertex); } });
    groups.push(group);
  }
  return groups;
}
export function cutEdges(edges, vertices) {
  const side = new Set(vertices);
  return edges.filter(([u, v]) => side.has(u) !== side.has(v));
}
export function reachAt(edges, source, hop) {
  const ds = distances(edges, source);
  return {
    distances: ds,
    reached: ds.filter(d => d <= hop).length,
    frontier: ds.filter(d => d === hop).length,
    waiting: ds.filter(d => Number.isFinite(d) && d > hop).length,
    unreachable: ds.filter(d => !Number.isFinite(d)).length,
    lastHop: Math.max(...ds.filter(Number.isFinite)),
  };
}
/** Drawing coordinates only: the same two hexagons for all three graphs. */
export const POSITIONS = Object.freeze(Array.from({ length: VERTEX_COUNT }, (_, i) => {
  const angle = -Math.PI / 2 + (i % 6) * Math.PI / 3 + (i < 6 ? 0 : Math.PI / 6);
  const radius = i < 6 ? 168 : 60;
  return Object.freeze([240 + radius * Math.cos(angle), 194 + radius * Math.sin(angle)]);
}));
