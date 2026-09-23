// Generates assets/specimen-19.svg from the same model the exhibit uses.
import { writeFileSync } from 'node:fs';
import * as M from '../public/series/assets/same-sum-model.js';
const runs = M.ORDER_NAMES.map(M.runOrder);
const W = 560, H = 330, X0 = 70, X1 = 536, Y0 = 70, Y1 = 262, LIMIT = 0.0021;
const sx = k => X0 + (X1 - X0) * k / M.N, sy = v => (Y0 + Y1) / 2 - (Y1 - Y0) / 2 * v / LIMIT;
const colors = ['#b59bff', '#67d7c4', '#8fb8ff'];
const names = ['Given', 'Ascending', 'Descending'];
const g = u => `${u > 0n ? '+' : u < 0n ? '−' : ''}${Number(u < 0n ? -u : u)} × 2⁻²⁰`;
let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc"><title id="title">Same numbers added, different totals</title><desc id="desc">Computed minus exact running total for three orders of the same 1,536 binary64 values, on one fixed axis from −0.0021 to +0.0021. Given drifts while the large value is held from step 385 to 1,153 and ends ${g(runs[0].errorUnits)} from exact. Ascending rounds once at step 1,535 and ends ${g(runs[1].errorUnits)}. Descending is exact.</desc><rect width="${W}" height="${H}" fill="#0d0b18"/><g font-family="Arial, sans-serif">`;
out += `<text x="24" y="28" font-size="14" fill="#f6f2ff">1,536 binary64 values · exact total ${M.unitsToDecimal(M.EXACT_UNITS).slice(0, 14)}…</text>`;
out += `<rect x="${sx(runs[0].largeInStep).toFixed(2)}" y="${Y0}" width="${(sx(runs[0].largeOutStep) - sx(runs[0].largeInStep)).toFixed(2)}" height="${Y1 - Y0}" fill="#b59bff" opacity=".09"/>`;
for (const v of [-0.002, -0.001, 0, 0.001, 0.002]) {
  out += `<path d="M${X0} ${sy(v).toFixed(2)}H${X1}" stroke="${v === 0 ? '#4d4672' : '#302a4e'}" stroke-width="${v === 0 ? 1 : .7}"/>`;
  out += `<text x="${X0 - 8}" y="${(sy(v) + 4).toFixed(2)}" text-anchor="end" font-size="11" fill="#a399bf">${v === 0 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v)}</text>`;
}
for (const k of [0, 384, 768, 1152, 1536]) out += `<text x="${sx(k).toFixed(2)}" y="${Y1 + 18}" text-anchor="middle" font-size="11" fill="#a399bf">${k.toLocaleString('en-US')}</text>`;
[1, 0, 2].forEach(i => {
  let d = `M${sx(0).toFixed(2)} ${sy(0).toFixed(2)}`;
  for (let k = 1; k <= M.N; k += 1) d += `H${sx(k).toFixed(2)}V${sy(runs[i].drift[k]).toFixed(2)}`;
  out += `<path d="${d}" fill="none" stroke="${colors[i]}" stroke-width="${i === 0 ? 1.4 : 1.8}"${i === 2 ? ' stroke-dasharray="5 4"' : ''}/>`;
});
names.forEach((name, i) => {
  const x = 24 + i * 180;
  out += `<rect x="${x}" y="${H - 34}" width="10" height="10" fill="${colors[i]}"/><text x="${x + 16}" y="${H - 25}" font-size="12" fill="#c9c0e5">${name} · ${runs[i].errorUnits === 0n ? 'exact' : g(runs[i].errorUnits)}</text>`;
});
out += `<text x="${X1}" y="${Y0 - 10}" text-anchor="end" font-size="11" fill="#a399bf">computed − exact running total</text></g></svg>\n`;
writeFileSync(new URL('../public/series/assets/specimen-19.svg', import.meta.url), out);
console.log('specimen-19.svg', out.length, 'bytes');
