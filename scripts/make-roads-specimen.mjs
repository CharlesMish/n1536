import { writeFileSync } from 'node:fs';
import { roadsModel } from '../public/series/assets/same-roads-model.js';

const maps = ['one', 'two', 'solo'].map((id, index) => {
  const m = roadsModel(id, false);
  const lines = m.roads.map(r => `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="${r.kind === 'bridge' ? '#f2a65a' : '#736a95'}" stroke-width="3"${r.empty ? ' stroke-dasharray="8 6"' : ''}/>`);
  const strands = [...m.strands, m.moverStrand].map(s => {
    const d = s.segs.map(edge => `M${edge.p.join(' ')} L${edge.q.join(' ')}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${s.counted ? '#b59bff' : '#a399bf'}" stroke-width="1.8"/>`;
  });
  const nodes = Object.entries(m.nodes).map(([name, [x, y]]) => `<circle cx="${x}" cy="${y}" r="17" fill="#171329" stroke="#c9c0e5"/><text x="${x}" y="${y+6}" font-size="18">${name}</text>`);
  return `<g transform="translate(${index*200},0)">
  <text x="100" y="34" fill="#c9c0e5">${['One fleet', 'Two fleets', 'Solo drivers'][index]}</text>
  <g transform="translate(0 48) scale(.51)">${[...lines, ...strands, ...nodes].join('\n    ')}</g>
  <text x="100" y="244" fill="#67d7c4">${m.S0.n.bridge} on bridge</text>
  <text x="100" y="265">${m.tiles.all.from} car-min</text></g>`;
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 280" fill="#f6f2ff" font-family="monospace" font-size="14" text-anchor="middle" role="img" aria-labelledby="title">
<title id="title">Five fixed roads and twelve cars under three fleet arrangements</title>
<rect width="600" height="280" fill="#0d0b18"/>
${maps.join('\n')}
</svg>\n`;
writeFileSync(new URL('../public/series/assets/specimen-21.svg', import.meta.url), svg);
