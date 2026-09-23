import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { specimen } from '../public/series/assets/same-reactions-model.js';

// Index and book share this static authored plate. All curves use the live model.
const output = fileURLToPath(new URL('../public/series/assets/specimen-20.svg', import.meta.url));
const cases = [
  { kind: 'center', name: 'CENTER', color: '#b59bff', peak: '1/4', displacement: '16/768' },
  { kind: 'pair', name: 'QUARTER PAIR', color: '#67d7c4', peak: '1/8', displacement: '11/768' },
  { kind: 'uniform', name: 'UNIFORM', color: '#f2a65a', peak: '1/8', displacement: '10/768' },
];
const n = x => Number(x.toFixed(2));
const curve = (model, fn, x0, y0, scale) => Array.from({ length: 65 }, (_, j) => {
  const u = j / 64;
  return `${j ? 'L' : 'M'}${n(x0 + u * 150)},${n(y0 + scale * fn.call(model, u))}`;
}).join(' ');

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 330" role="img" aria-labelledby="title desc">
<title id="title">SAME REACTIONS · three load patterns</title>
<desc id="desc">All beams have support reactions W over 2 on each end. Center point loading produces normalized peak moment 1/4 and deflection 16/768. The quarter-point pair and uniform loading share peak moment 1/8 but have deflections 11/768 and 10/768.</desc>
<rect width="600" height="330" fill="#0d0b18"/>
<g font-family="Helvetica,Arial,sans-serif"><text x="18" y="24" fill="#c9c0e5" font-size="12">ONE BEAM / THREE LOAD PATTERNS</text><text x="582" y="24" fill="#67d7c4" text-anchor="end" font-size="12">Rₐ = Rᵦ = W/2</text></g>`;
for (const [i, item] of cases.entries()) {
  const model = specimen(item.kind);
  const left = 18 + i * 198;
  const x0 = left + 23;
  const x1 = x0 + 150;
  const at = u => n(x0 + 150 * u);
  svg += `<g font-family="Helvetica,Arial,sans-serif" font-size="11">
    ${i ? `<path d="M${left - 9} 39V314" stroke="#302a4e"/>` : ''}
    <text x="${left}" y="55" fill="${item.color}" font-size="15">0${i + 1} / ${item.name}</text>
    <path d="M${x0} 114H${x1}" stroke="#f6f2ff" stroke-width="4" stroke-linecap="round"/>
    <path d="M${x0} 118l-7 11h14Z M${x1} 118l-7 11h14Z" fill="#171329" stroke="#c9c0e5"/>
    <circle cx="${x1 - 4}" cy="132" r="2" fill="#171329" stroke="#c9c0e5"/><circle cx="${x1 + 4}" cy="132" r="2" fill="#171329" stroke="#c9c0e5"/>
    <path d="M${x0 - 10} 132h20 M${x1 - 10} 136h20" stroke="#c9c0e5"/>
    <path d="M${x0} 153v-16 M${x1} 153v-12" stroke="#67d7c4" stroke-width="1.5"/>
    <path d="M${x0 - 4} 144l4-7 4 7 M${x1 - 4} 148l4-7 4 7" fill="#67d7c4"/>
    <text x="${x0}" y="164" text-anchor="middle" fill="#67d7c4">½W</text><text x="${x1}" y="164" text-anchor="middle" fill="#67d7c4">½W</text>`;
  if (item.kind === 'uniform') {
    svg += `<path d="M${x0} 79H${x1}v7H${x0}Z" fill="${item.color}" fill-opacity=".22" stroke="${item.color}"/>`;
    for (let j = 0; j <= 12; j++) svg += `<path d="M${at(j / 12)} 86v23m-3-5 3 5 3-5" fill="none" stroke="${item.color}" stroke-width="1.2"/>`;
  } else {
    for (const load of model.pointLoads) svg += `<path d="M${at(load.u)} 77v32m-4-6 4 6 4-6" fill="none" stroke="${item.color}" stroke-width="1.7"/>`;
  }
  svg += `<text x="${left}" y="182" fill="#a399bf">M / WL</text><path d="M${x0} 218H${x1}" stroke="#4d4672"/>
    <path d="${curve(model, model.moment, x0, 218, -38 / .25)}" fill="none" stroke="${item.color}" stroke-width="2.2"/>
    <text x="${left}" y="242" fill="#a399bf">δ / (WL³/EI)</text><path d="M${x0} 253H${x1}" stroke="#4d4672"/>
    <path d="${curve(model, model.displacement, x0, 253, 40 / (1 / 48))}" fill="none" stroke="${item.color}" stroke-width="2.2"/>
    <text x="${left}" y="311" fill="#c9c0e5">Mmax ${item.peak}</text><text x="${left + 94}" y="311" fill="#c9c0e5">δmid ${item.displacement}</text>
  </g>`;
}
svg += '</svg>\n';
writeFileSync(output, svg.replace(/[ \t]+$/gm, ''), 'utf8');
console.log(`Wrote ${output}`);
