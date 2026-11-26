// Valorant-style Crosshair Studio: code parser/exporter + crisp symmetrical SVG renderer.
const STORAGE_KEY = 'df-crosshair';

export const VAL_COLORS = {
  0: '#ffffff', // White
  1: '#00ff00', // Green
  2: '#7fff00', // Yellow Green
  3: '#dfff00', // Green Yellow
  4: '#ffff00', // Yellow
  5: '#00ffff', // Cyan
  6: '#ff00ff', // Pink
  7: '#ff2a3c'  // Red
};

export const CROSSHAIR_PRESETS = [
  {id: 'compact', name: '8×8 紧凑白十字', cfg: {color: '#ffffff', length: 2, thickness: 2, offset: 0, outline: true, dot: false, dotSize: 2, opacity: 1}},
  {id: 'marteen', name: 'M8 Marteen 青十字', cfg: {color: '#00ffff', length: 3, thickness: 2, offset: 0, outline: true, dot: false, dotSize: 2, opacity: 1}},
  {id: 'dot', name: '无畏小红点', cfg: {color: '#ff2a3c', length: 0, thickness: 2, offset: 0, outline: true, dot: true, dotSize: 3, opacity: 1}},
  {id: 'csgreen', name: 'CS 经典绿中空', cfg: {color: '#00ff66', length: 4, thickness: 2, offset: 2, outline: true, dot: false, dotSize: 2, opacity: 1}}
];

export const DEFAULT_CROSSHAIR = {...CROSSHAIR_PRESETS[0].cfg};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function normalizeCrosshair(raw = {}) {
  return {
    color: /^#[0-9a-fA-F]{6}$/.test(raw.color || '') ? raw.color.toLowerCase() : DEFAULT_CROSSHAIR.color,
    length: clamp(Math.round(Number(raw.length ?? DEFAULT_CROSSHAIR.length)), 0, 12),
    thickness: clamp(Math.round(Number(raw.thickness ?? DEFAULT_CROSSHAIR.thickness)), 1, 5),
    offset: clamp(Math.round(Number(raw.offset ?? DEFAULT_CROSSHAIR.offset)), 0, 8),
    outline: raw.outline !== undefined ? !!raw.outline : true,
    dot: !!raw.dot,
    dotSize: clamp(Math.round(Number(raw.dotSize ?? 2)), 1, 5),
    opacity: clamp(Number(raw.opacity ?? 1), .25, 1)
  };
}

export function loadCrosshair() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved) return normalizeCrosshair(saved);
  } catch {}
  return {...DEFAULT_CROSSHAIR};
}

export function saveCrosshair(cfg) {
  const clean = normalizeCrosshair(cfg);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(clean)); } catch {}
  return clean;
}

// Parse standard VALORANT crosshair profile code (e.g. 0;s;1;P;c;5;o;1;0l;3;0o;0;0a;1;0f;0;1b;0).
export function parseValorantCode(code) {
  const text = String(code || '').trim();
  if (!text || !text.includes(';')) return null;
  const parts = text.split(';');
  // Focus on Primary profile section 'P' if present, otherwise parse all tokens.
  let start = parts.indexOf('P');
  if (start < 0) start = 0; else start += 1;
  const map = {};
  for (let i = start; i + 1 < parts.length; i += 2) {
    const k = parts[i];
    if (k === 'A' || k === 'S') break; // Stop at ADS / Sniper section.
    map[k] = parts[i + 1];
  }
  if (!Object.keys(map).length) return null;

  let color = '#ffffff';
  if (map.u && /^[0-9a-fA-F]{6,8}$/.test(map.u)) {
    color = '#' + map.u.slice(0, 6).toLowerCase();
  } else if (map.c !== undefined && VAL_COLORS[Number(map.c)]) {
    color = VAL_COLORS[Number(map.c)];
  }
  const showInner = map['0b'] === undefined ? true : Number(map['0b']) !== 0;
  const length = showInner ? (map['0l'] !== undefined ? Number(map['0l']) : 4) : 0;
  const thickness = map['0t'] !== undefined ? Number(map['0t']) : 2;
  const offset = map['0o'] !== undefined ? Number(map['0o']) : 2;
  const outline = map.h !== undefined ? Number(map.h) !== 0 : (map.o !== undefined ? Number(map.o) > 0 : true);
  const dot = map.d !== undefined ? Number(map.d) !== 0 : false;
  const dotSize = map.z !== undefined ? Number(map.z) : 2;
  const opacity = map['0a'] !== undefined ? Number(map['0a']) : 1;

  return normalizeCrosshair({color, length, thickness, offset, outline, dot, dotSize, opacity});
}

export function exportValorantCode(cfg) {
  const c = normalizeCrosshair(cfg);
  const colorEntry = Object.entries(VAL_COLORS).find(([, hex]) => hex === c.color);
  const tokens = ['0', 'P'];
  if (colorEntry) tokens.push('c', colorEntry[0]);
  else tokens.push('c', '8', 'u', c.color.slice(1).toUpperCase() + 'FF');
  tokens.push('h', c.outline ? '1' : '0', 'o', c.outline ? '1' : '0');
  if (c.dot) tokens.push('d', '1', 'z', String(c.dotSize));
  if (c.length <= 0) {
    tokens.push('0b', '0');
  } else {
    tokens.push('0t', String(c.thickness), '0l', String(c.length), '0o', String(c.offset), '0a', String(c.opacity), '0f', '0');
  }
  tokens.push('1b', '0');
  return tokens.join(';');
}

// Render an exact integer-grid crispEdges SVG so it stays 100% symmetrical at any DPI scaling.
export function buildCrosshairSvg(cfg) {
  const c = normalizeCrosshair(cfg);
  const pad = c.outline ? 1 : 0;
  const t = c.thickness;
  const len = c.length;
  const off = c.offset;
  const dotS = c.dot ? c.dotSize : 0;

  // Parity alignment: keep center parity consistent between cross arms and dot.
  const armSpan = len > 0 ? (off === 0 ? len * 2 + t : (off + len) * 2 + (t % 2)) : 0;
  const inner = Math.max(armSpan, dotS, 2);
  const size = inner + pad * 2;
  // Ensure parity matches thickness so arms sit on exact integer pixels.
  const finalSize = (len > 0 && ((size - t) % 2 !== 0)) ? size + 1 : size;
  const cx = finalSize / 2;

  const rects = [];
  const outlines = [];

  if (len > 0) {
    if (off === 0) {
      // Seamless solid cross (no center gap).
      const x = cx - t / 2, y = cx - t / 2 - len, h = len * 2 + t;
      rects.push([x, y, t, h], [y, x, h, t]);
      if (c.outline) outlines.push([x - 1, y - 1, t + 2, h + 2], [y - 1, x - 1, h + 2, t + 2]);
    } else {
      const halfGap = off + (t % 2) * .5;
      const a0 = cx - t / 2;
      const topY = cx - halfGap - len;
      const botY = cx + halfGap;
      const arms = [
        [a0, topY, t, len],
        [a0, botY, t, len],
        [topY, a0, len, t],
        [botY, a0, len, t]
      ];
      for (const [rx, ry, rw, rh] of arms) {
        rects.push([rx, ry, rw, rh]);
        if (c.outline) outlines.push([rx - 1, ry - 1, rw + 2, rh + 2]);
      }
    }
  }

  if (c.dot) {
    const dx = Math.floor(cx - dotS / 2);
    rects.push([dx, dx, dotS, dotS]);
    if (c.outline) outlines.push([dx - 1, dx - 1, dotS + 2, dotS + 2]);
  }

  const rSvg = (list, fill, op = 1) =>
    list.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${op < 1 ? ` fill-opacity="${op}"` : ''}/>`).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${finalSize}" height="${finalSize}" viewBox="0 0 ${finalSize} ${finalSize}" shape-rendering="crispEdges">${rSvg(outlines, '#000', Math.min(1, c.opacity + .15))}${rSvg(rects, c.color, c.opacity)}</svg>`;
  return {size: finalSize, url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`};
}

export function applyCrosshair(el, cfg) {
  if (!el) return;
  const {size, url} = buildCrosshairSvg(cfg);
  el.style.width = size + 'px';
  el.style.height = size + 'px';
  el.style.backgroundImage = url;
  el.style.backgroundSize = `${size}px ${size}px`;
}

export function studioMarkup(cfg) {
  const c = normalizeCrosshair(cfg);
  const code = exportValorantCode(c);
  const swatches = ['#ffffff', '#00ffff', '#00ff66', '#ffff00', '#ff2a3c', '#ff4fe3'].map(hex =>
    `<button type="button" class="swatch" data-color="${hex}" style="background:${hex}" aria-pressed="${c.color === hex}" aria-label="${hex}"></button>`
  ).join('');
  const presets = CROSSHAIR_PRESETS.map(p =>
    `<button type="button" class="secondary" data-preset="${p.id}">${p.name}</button>`
  ).join('');

  return `<div class="xhStudio">
    <div class="xhPreviewRow">
      <div class="xhPreview dark"><span>暗部货柜</span><div class="xhSample"></div></div>
      <div class="xhPreview light"><span>明亮天空</span><div class="xhSample"></div></div>
      <div class="xhPreview wood"><span>木箱背景</span><div class="xhSample"></div></div>
    </div>
    <div class="xhPresets">${presets}</div>
    <div class="xhCodeRow">
      <input type="text" id="xhCode" value="${code}" placeholder="粘贴无畏契约准星代码，如 0;s;1;P;c;5;o;1;0l;3;0o;0;0a;1;0f;0;1b;0" spellcheck="false">
      <button type="button" id="xhImport" class="secondary">导入代码</button>
      <button type="button" id="xhCopy" class="secondary">复制</button>
    </div>
    <div class="row"><span>颜色</span><div class="swatches">${swatches}<input type="color" id="xhColor" value="${c.color}" title="自定义颜色"></div></div>
    <div class="row"><label for="xhLen">臂长</label><input type="range" id="xhLen" min="0" max="10" step="1" value="${c.length}"><output>${c.length}</output></div>
    <div class="row"><label for="xhThick">粗细</label><input type="range" id="xhThick" min="1" max="4" step="1" value="${c.thickness}"><output>${c.thickness}</output></div>
    <div class="row"><label for="xhOff">中空偏移</label><input type="range" id="xhOff" min="0" max="6" step="1" value="${c.offset}"><output>${c.offset}</output></div>
    <div class="row"><label for="xhDotSize">中心点大小</label><input type="range" id="xhDotSize" min="1" max="5" step="1" value="${c.dotSize}"><output>${c.dotSize}</output></div>
    <div class="xhToggles">
      <button type="button" id="xhOutline" class="secondary" aria-pressed="${c.outline}">黑边描边：${c.outline ? '开' : '关'}</button>
      <button type="button" id="xhDot" class="secondary" aria-pressed="${c.dot}">中心点：${c.dot ? '开' : '关'}</button>
    </div>
  </div>`;
}
