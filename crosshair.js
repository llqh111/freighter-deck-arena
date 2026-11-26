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

// Render on an exact physical-pixel Canvas (DPR-aware) so arms and 1px outlines
// are 100% symmetrical on 100%, 125%, 150%, 175%, and 200% Windows DPI scaling.
export function buildCrosshairImage(cfg) {
  const c = normalizeCrosshair(cfg);
  const dpr = Math.max(1, Number(globalThis.devicePixelRatio) || 1);
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

  const cssSize = physSize / dpr;
  return {cssSize, physSize, dpr, url: `url("${canvas.toDataURL('image/png')}")`};
}

export function applyCrosshair(el, cfg, snapViewport = false) {
  if (!el) return;
  const {cssSize, physSize, dpr, url} = buildCrosshairImage(cfg);
  el.style.width = cssSize + 'px';
  el.style.height = cssSize + 'px';
  el.style.backgroundImage = url;
  el.style.backgroundSize = `${cssSize}px ${cssSize}px`;
  if (snapViewport) {
    // Snap element top-left to exact physical pixel boundary to prevent half-pixel blur/shift.
    const leftPhys = Math.floor((innerWidth * dpr - physSize) / 2);
    const topPhys = Math.floor((innerHeight * dpr - physSize) / 2);
    el.style.left = (leftPhys / dpr) + 'px';
    el.style.top = (topPhys / dpr) + 'px';
    el.style.transform = 'none';
  }
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
