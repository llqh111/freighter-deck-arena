// 生成新金字塔三视图（俯视图 Top X-Z / 正视图 Front X-Y / 侧视图 Side Z-Y）SVG
import {writeFileSync} from 'node:fs';
import {buildPyramidWorld} from '../pyramid-world.js';

const w = buildPyramidWorld(null);
const {bounds, solids, spawns, vents, ai} = w;
const bw = bounds.maxX - bounds.minX;
const bd = bounds.maxZ - bounds.minZ;
const maxH = 6.2;

const fillOf = s => {
  if (s.walkSurface) return '#e2b86b';
  if (s.material === 'wood') return '#9e6b3b';
  if (s.bottom >= 3.5) return 'rgba(130,104,72,0.35)';
  return '#7d6a54';
};

// 1. Top View (X-Z), scale = 12px/m
const topS = 12, topOx = 220, topOy = 350;
let topSvg = `<rect x="${topOx + bounds.minX * topS}" y="${topOy + bounds.minZ * topS}" width="${bw * topS}" height="${bd * topS}" fill="#231f1a" stroke="#d4a64a" stroke-width="2"/>`;
for (const s of solids) {
  const cx = topOx + s.x * topS, cy = topOy + s.z * topS;
  const sw = s.w * topS, sd = s.d * topS;
  const deg = -((s.yaw || 0) * 180 / Math.PI);
  topSvg += `<rect x="${-sw/2}" y="${-sd/2}" width="${sw}" height="${sd}" transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${deg.toFixed(1)})" fill="${fillOf(s)}" stroke="#161310" stroke-width="0.7" opacity="${s.bottom >= 3.5 ? 0.35 : 0.92}"/>`;
}
// Vents arrows
for (const v of vents) {
  const x1 = topOx + v.entry.x * topS, y1 = topOy + v.entry.z * topS;
  const x2 = topOx + v.exit.x * topS, y2 = topOy + v.exit.z * topS;
  topSvg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffd24c" stroke-width="2.5" stroke-dasharray="6 4"/>`;
  topSvg += `<circle cx="${x2}" cy="${y2}" r="4.5" fill="#ffd24c"/>`;
}
// Spawns & Snipers
spawns.forEach((list, t) => {
  for (const p of list) {
    topSvg += `<circle cx="${topOx + p.x * topS}" cy="${topOy + p.z * topS}" r="4" fill="${t ? '#ff6b57' : '#66d0f5'}" stroke="#111" stroke-width="1"/>`;
  }
});
ai.snipers.forEach((list, t) => {
  for (const p of list) {
    topSvg += `<rect x="${topOx + p.x * topS - 4}" y="${topOy + p.z * topS - 4}" width="8" height="8" fill="${t ? '#ff9f43' : '#48dbfb'}" stroke="#fff" stroke-width="1"/>`;
  }
});
// Mid sniper sightline
topSvg += `<line x1="${topOx}" y1="${topOy - 20 * topS}" x2="${topOx}" y2="${topOy + 20 * topS}" stroke="#ff4757" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.8"/>`;

// 2. Front View (X-Y, looking from +Z toward -Z), scale = 14px/m
const fS = 14, fOx = 670, fOy = 220;
let frontSvg = `<line x1="${fOx + bounds.minX * fS - 20}" y1="${fOy}" x2="${fOx + bounds.maxX * fS + 20}" y2="${fOy}" stroke="#d4a64a" stroke-width="2"/>`;
const sortedFront = [...solids].filter(s => Math.abs(s.z) < 20.5).sort((a, b) => a.z - b.z);
for (const s of sortedFront) {
  const x = fOx + (s.x - s.w / 2) * fS;
  const y = fOy - s.top * fS;
  const rw = s.w * fS, rh = (s.top - s.bottom) * fS;
  frontSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${fillOf(s)}" stroke="#161310" stroke-width="0.7" opacity="0.72"/>`;
}

// 3. Side View (Z-Y, looking from +X toward -X), scale = 10px/m
const sS = 10, sOx = 670, sOy = 470;
let sideSvg = `<line x1="${sOx + bounds.minZ * sS - 15}" y1="${sOy}" x2="${sOx + bounds.maxZ * sS + 15}" y2="${sOy}" stroke="#d4a64a" stroke-width="2"/>`;
const sortedSide = [...solids].filter(s => Math.abs(s.x) < 14.5).sort((a, b) => a.x - b.x);
for (const s of sortedSide) {
  const x = sOx + (s.z - s.d / 2) * sS;
  const y = sOy - s.top * sS;
  const rw = s.d * sS, rh = (s.top - s.bottom) * sS;
  sideSvg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" fill="${fillOf(s)}" stroke="#161310" stroke-width="0.6" opacity="0.68"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="700" viewBox="0 0 980 700" style="background:#14181d;font-family:Consolas,Microsoft YaHei,sans-serif">
  <text x="220" y="28" fill="#f6e5c0" font-size="16" font-weight="bold" text-anchor="middle">俯视图 TOP VIEW (X-Z) · ${bw.toFixed(1)}m × ${bd.toFixed(1)}m</text>
  ${topSvg}
  <text x="670" y="60" fill="#f6e5c0" font-size="16" font-weight="bold" text-anchor="middle">正视图 FRONT VIEW (X-Y · 中门对狙缝与跳攀金字塔高台)</text>
  ${frontSvg}
  <text x="670" y="330" fill="#f6e5c0" font-size="16" font-weight="bold" text-anchor="middle">侧视图 SIDE VIEW (Z-Y · 封闭墓室、中路石柱与双向地面侧道)</text>
  ${sideSvg}
  <g transform="translate(460,555)" font-size="12" fill="#d8d2c5">
    <rect x="0" y="0" width="14" height="14" fill="#7d6a54"/><text x="20" y="12">纯石质掩体/石柱 (不可穿)</text>
    <rect x="190" y="0" width="14" height="14" fill="#e2b86b"/><text x="210" y="12">跳箱身法高台/金字塔 (需跳跃/蹲跳)</text>
    <rect x="0" y="24" width="14" height="14" fill="#9e6b3b"/><text x="20" y="36">极少可穿木箱 (wood)</text>
    <circle cx="197" cy="31" r="5" fill="#66d0f5"/><text x="210" y="36">保卫者出生点 (+Z)</text>
    <circle cx="0" cy="55" r="5" fill="#ff6b57"/><text x="20" y="60">潜伏者出生点 (-Z)</text>
    <line x1="190" y1="55" x2="215" y2="55" stroke="#ff4757" stroke-width="2" stroke-dasharray="4 3"/><text x="222" y="60">中门对狙贯通视线</text>
  </g>
</svg>`;

const outPath = new URL('./pyramid-three-views.svg', import.meta.url);
writeFileSync(outPath, svg, 'utf8');
console.log('Generated three-view blueprint:', outPath.pathname, 'solids:', solids.length);
