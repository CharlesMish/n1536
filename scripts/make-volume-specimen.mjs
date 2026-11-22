import { readFileSync, writeFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';

const assets = new URL('../public/series/assets/', import.meta.url);
const solver = readFileSync(new URL('volume-obligations.worker.js', assets), 'utf8');
// Run the very same classic worker as the exhibit. Only its final message is archived.
let result;
const solve = runInThisContext(`(function (postMessage) { let onmessage; ${solver}
  onmessage({data: {type: "run", requestId: 1}});
})`);
solve(message => { if (message.type === 'done') result = message; });

const cases = [
  ['carry', 'Carry', 'Minimize mechanical compliance'],
  ['conduct', 'Conduct', 'Minimize thermal compliance'],
  ['share', 'Share', 'Give both normalized objectives equal weight'],
];
const width = 56, height = 28;

// Coalesce adjacent cells of equal displayed density. Each input cell still has its own value.
function densityPaths(field) {
  const groups = new Map();
  for (let y = 0; y < height; y++) {
    const level = x => Math.round(255 * field.rho[x * height + height - 1 - y]);
    for (let x = 0; x < width;) {
      const tone = level(x);
      let end = x + 1;
      while (end < width && level(end) === tone) end++;
      if (tone) {
        const run = end - x;
        groups.set(tone, (groups.get(tone) ?? '') + `M${x} ${y}h${run}v1h-${run}z`);
      }
      x = end;
    }
  }
  return [...groups].map(([tone, path]) =>
    `<path opacity="${(tone / 255).toFixed(4)}" d="${path}"/>`).join('\n');
}

const ratio = value => value.toLocaleString('en-US', {
  minimumFractionDigits: value >= 100 ? 0 : 2,
  maximumFractionDigits: value >= 100 ? 0 : 2,
}) + '×';
const panels = cases.map(([id, name, objective]) => {
  const field = result.fields[id];
  const mech = ratio(field.Cm / result.CmStar), therm = ratio(field.Ct / result.CtStar);
  return `<g id="${id}" font-family="Helvetica, Arial, sans-serif" fill="var(--ink,#f6f2ff)">
    <title>${name}</title>
    <desc>${objective}. Relative mechanical compliance ${mech}. Relative thermal compliance ${therm}. Mean density ${field.vol.toFixed(8)}.</desc>
    <path d="M0 1H360" stroke="var(--spine,#4d4672)"/>
    <text x="0" y="35" font-size="27">${name}</text>
    <text x="0" y="57" font-size="13" fill="var(--ink-muted,#c9c0e5)">${objective}</text>
    <g font-family="monospace" font-size="12">
      <text x="12" y="84" fill="var(--summary,#67d7c4)">HEAT SINK</text>
      <text x="348" y="84" text-anchor="end" fill="var(--warm,#f2a65a)">LOAD ↓</text>
      <svg x="12" y="93" width="336" height="168" viewBox="0 0 56 28">
        <rect width="56" height="28" fill="var(--void,#2a2542)"/>
        <g fill="var(--solid,#efe7ff)" shape-rendering="crispEdges">${densityPaths(field)}</g>
        <g fill="none" stroke-width=".35">
          <path d="M.18 .18h2.64v2.64H.18z" stroke="var(--summary,#67d7c4)"/>
          <path d="M53.18 .18h2.64v2.64h-2.64z" stroke="var(--warm,#f2a65a)"/>
          <path d="M.18 25.18h2.64v2.64H.18z" stroke="var(--ink,#f6f2ff)"/>
          <path d="M53.18 25.18h2.64v2.64h-2.64z" stroke="var(--alert,#e57fa6)"/>
        </g>
      </svg>
      <path d="M353 91v20m-3-4 3 4 3-4" fill="none" stroke="var(--warm,#f2a65a)" stroke-width="1.5"/>
      <path d="M11 242v19m0-18-5 4m5 2-5 4m5 2-5 4m5 2-5 4" fill="none" stroke="var(--ink,#f6f2ff)"/>
      <text x="12" y="281">FIXED SUPPORT</text>
      <text x="348" y="281" text-anchor="end" fill="var(--alert,#e57fa6)">HEAT SOURCE</text>
    </g>
    <path d="M0 296H360" stroke="var(--rule,#4d4672)"/>
    <g fill="var(--ink-muted,#c9c0e5)" font-size="13">
      <text x="0" y="319">Mechanical / Carry</text>
      <text x="186" y="319">Thermal / Conduct</text>
    </g>
    <g font-family="monospace" font-size="26">
      <text x="0" y="355">${mech}</text>
      <text x="186" y="355">${therm}</text>
    </g>
  </g>`;
});

const output = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1184 580" role="img" aria-labelledby="title desc">
  <title id="title">SAME VOLUME · Three designs at one material budget</title>
  <desc id="desc">Three finished local density-optimization runs with the same 40% target, mesh and boundary conditions. Carry and Conduct specialize. Share combines both load paths. Each performance ratio uses its own specialist as the reference.</desc>
  <defs>${panels.join('\n')}</defs>
  <rect width="1184" height="580" fill="#0d0b18"/>
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="28" y="37" font-size="13" font-family="monospace" fill="#67d7c4">SAME VOLUME  /  FIELD STUDY 06</text>
    <text x="28" y="81" font-size="36" fill="#f6f2ff">Three designs at one material budget</text>
    <text x="28" y="111" font-size="16" fill="#c9c0e5">Each finished field uses the same 56 × 28 mesh and a target mean material density of 0.40.</text>
    ${cases.map(([id], i) => `<use href="#${id}" x="${28 + 384 * i}" y="139"/>`).join('\n    ')}
    <path d="M28 522H1156" stroke="#4d4672"/>
    <text x="28" y="548" fill="#c9c0e5" font-size="15">Greater compliance means more displacement under the load or a greater temperature rise under the heat input.</text>
    <text x="28" y="570" fill="#c9c0e5" font-size="14">Each ratio uses the corresponding specialist as 1.00×. Light cells are denser. Results are local SIMP designs.</text>
  </g>
</svg>\n`;
const destination = new URL('specimen-06-comparison.svg', assets);
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== output) throw new Error('Regenerate the VOLUME comparison from the current worker.');
} else {
  writeFileSync(destination, output);
}
