// Crosshair Studio profile conversion and pixel-aligned drawing.
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
const profileNumbers = ['c', 'h', 'o', 'd', 'z', '0b', '0l', '0t', '0o', '0a'];

export function normalizeCrosshair(raw = {}) {
  const number = key => {
    const value = Number(raw[key] ?? DEFAULT_CROSSHAIR[key]);
    return Number.isFinite(value) ? value : DEFAULT_CROSSHAIR[key];
  };
  return {
    color: /^#[0-9a-fA-F]{6}$/.test(raw.color || '') ? raw.color.toLowerCase() : DEFAULT_CROSSHAIR.color,
    length: clamp(Math.round(number('length')), 0, 12),
    thickness: clamp(Math.round(number('thickness')), 1, 5),
    offset: clamp(Math.round(number('offset')), 0, 8),
    outline: raw.outline !== undefined ? !!raw.outline : true,
    dot: !!raw.dot,
    dotSize: clamp(Math.round(number('dotSize')), 1, 5),
    opacity: clamp(number('opacity'), .25, 1)
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
  const parts = text.split(';').map(part => part.trim());
  // Focus on Primary profile section 'P' if present, otherwise parse all tokens.
  let start = parts.indexOf('P');
  if (start < 0) start = parts[0] === '0' ? 1 : 0; else start += 1;
  const map = Object.create(null);
  for (let i = start; i < parts.length; i += 2) {
    const k = parts[i], value = parts[i + 1];
    if (k === 'A' || k === 'S') break; // Stop at ADS / Sniper section.
    if (!k || !value) return null;
    map[k] = value;
  }
  const numericFields = profileNumbers.filter(key => key in map);
  if (!numericFields.length && !('u' in map)) return null;
  for (const key of numericFields) {
    const value = Number(map[key]);
    if (!Number.isFinite(value)) return null;
    map[key] = value;
  }
  if ('u' in map && !/^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(map.u)) return null;
  if ('c' in map && !(map.c in VAL_COLORS) && !(map.c === 8 && map.u)) return null;

  const cfg = normalizeCrosshair({
    color: map.u ? '#' + map.u.slice(0, 6) : VAL_COLORS[map.c],
    length: map['0b'] === 0 ? 0 : (map['0l'] ?? 4),
    thickness: map['0t'],
    offset: map['0o'] ?? 2,
    outline: map.h === undefined ? (map.o ?? 1) > 0 : map.h !== 0,
    dot: !!map.d,
    dotSize: map.z,
    opacity: map['0a']
  });
  return cfg.length || cfg.dot ? cfg : null;
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

// Draw the sprite at its final physical-pixel size.
function buildCrosshairSprite(cfg, dpr) {
  const c = normalizeCrosshair(cfg);
  const scale = v => Math.max(1, Math.round(v * dpr));

  const pt = scale(c.thickness);
  const pl = c.length > 0 ? scale(c.length) : 0;
  const po = c.offset > 0 ? Math.round(c.offset * dpr) : 0;
  const pad = c.outline ? Math.max(1, Math.round(dpr)) : 0;
  let pDot = c.dot ? scale(c.dotSize) : 0;

  // Match dot parity to arm thickness parity so dot and arms share the exact same center.
  if (pl > 0 && pDot > 0 && (pDot % 2) !== (pt % 2)) pDot += 1;

  const armSpan = pl > 0 ? (po === 0 ? pl * 2 + pt : po * 2 + pl * 2 + pt) : 0;
  const inner = Math.max(armSpan, pDot, 2);
  let physSize = inner + pad * 2;
  const refParity = pl > 0 ? pt % 2 : pDot % 2;
  if ((physSize % 2) !== refParity) physSize += 1;

  const canvas = document.createElement('canvas');
  canvas.width = physSize;
  canvas.height = physSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const rects = [];
  const outlines = [];

  if (pl > 0) {
    const a0 = (physSize - pt) / 2; // Guaranteed integer because physSize % 2 === pt % 2.
    if (po === 0) {
      const span = pl * 2 + pt;
      const start = (physSize - span) / 2;
      rects.push([a0, start, pt, span], [start, a0, span, pt]);
      if (pad) outlines.push([a0 - pad, start - pad, pt + pad * 2, span + pad * 2], [start - pad, a0 - pad, span + pad * 2, pt + pad * 2]);
    } else {
      const topY = a0 - po - pl;
      const botY = a0 + pt + po;
      const arms = [
        [a0, topY, pt, pl],
        [a0, botY, pt, pl],
        [topY, a0, pl, pt],
        [botY, a0, pl, pt]
      ];
      for (const [rx, ry, rw, rh] of arms) {
        rects.push([rx, ry, rw, rh]);
        if (pad) outlines.push([rx - pad, ry - pad, rw + pad * 2, rh + pad * 2]);
      }
    }
  }

  if (pDot > 0) {
    const d0 = (physSize - pDot) / 2; // Guaranteed integer.
    rects.push([d0, d0, pDot, pDot]);
    if (pad) outlines.push([d0 - pad, d0 - pad, pDot + pad * 2, pDot + pad * 2]);
  }

  if (outlines.length) {
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = Math.min(1, c.opacity + .15);
    for (const [x, y, w, h] of outlines) ctx.fillRect(x, y, w, h);
  }
  if (rects.length) {
    ctx.fillStyle = c.color;
    ctx.globalAlpha = c.opacity;
    for (const [x, y, w, h] of rects) ctx.fillRect(x, y, w, h);
  }

  return canvas;
}

export function drawViewportCrosshair(canvas, cfg, size) {
  const dpr = devicePixelRatio || 1;
  const scaledWidth = Math.round(innerWidth * dpr);
  const scaledHeight = Math.round(innerHeight * dpr);
  // A device-pixel box can still describe the previous size during a resize.
  const width = Math.abs(size?.inlineSize - scaledWidth) <= 1 ? size.inlineSize : scaledWidth;
  const height = Math.abs(size?.blockSize - scaledHeight) <= 1 ? size.blockSize : scaledHeight;
  if (!width || !height) return;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const sprite = buildCrosshairSprite(cfg, dpr);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(sprite, Math.floor((width - sprite.width) / 2), Math.floor((height - sprite.height) / 2));
}

export function applyCrosshair(el, cfg) {
  const dpr = devicePixelRatio || 1;
  const sprite = buildCrosshairSprite(cfg, dpr);
  const cssSize = sprite.width / dpr + 'px';
  el.style.width = cssSize;
  el.style.height = cssSize;
  el.style.backgroundImage = `url("${sprite.toDataURL('image/png')}")`;
  el.style.backgroundSize = `${cssSize} ${cssSize}`;
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
    <div class="row"><label for="xhLen">臂长</label><input type="range" id="xhLen" min="0" max="12" step="1" value="${c.length}"><output>${c.length}</output></div>
    <div class="row"><label for="xhThick">粗细</label><input type="range" id="xhThick" min="1" max="5" step="1" value="${c.thickness}"><output>${c.thickness}</output></div>
    <div class="row"><label for="xhOff">中空偏移</label><input type="range" id="xhOff" min="0" max="8" step="1" value="${c.offset}"><output>${c.offset}</output></div>
    <div class="row"><label for="xhDotSize">中心点大小</label><input type="range" id="xhDotSize" min="1" max="5" step="1" value="${c.dotSize}"><output>${c.dotSize}</output></div>
    <div class="xhToggles">
      <button type="button" id="xhOutline" class="secondary" aria-pressed="${c.outline}">黑边描边：${c.outline ? '开' : '关'}</button>
      <button type="button" id="xhDot" class="secondary" aria-pressed="${c.dot}">中心点：${c.dot ? '开' : '关'}</button>
    </div>
  </div>`;
}
