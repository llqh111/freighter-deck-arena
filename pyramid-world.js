import * as T from './three.module.js';
import {makeEffects} from './deck-effects.js?v=8';

function randomSource(seed) {
  return () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
}

function sheet(w, h) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return el.getContext('2d');
}

function canvasMap(ctx, textures) {
  const tex = new T.CanvasTexture(ctx.canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  if (textures) textures.push(tex);
  return tex;
}

function sandGrain(c, w, h, seed, count) {
  const r = randomSource(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * w, y = r() * h;
    c.fillStyle = r() > .45 ? 'rgba(84,56,28,.13)' : 'rgba(255,241,206,.14)';
    c.fillRect(x, y, .7 + r() * 2.2, .7 + r() * 2.2);
  }
}

// Egyptian sandstone masonry with optional carved hieroglyphic frieze, Eye of Horus & turquoise/gold inlays.
function sandstoneSkin(seed, carved, textures) {
  const w = 512, h = 512, c = sheet(w, h), r = randomSource(seed);
  c.fillStyle = carved ? '#caa978' : '#d6ba89';
  c.fillRect(0, 0, w, h);

  const rows = 8, rowH = h / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    const cols = 4, colW = w / cols, offset = (row % 2) * (colW * .5);
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const shade = Math.floor((r() - .5) * 22);
      c.fillStyle = `rgb(${212 + shade},${180 + shade},${130 + Math.floor(shade * .72)})`;
      c.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      // Warm sunlit top bevel
      c.fillStyle = 'rgba(255,245,216,.24)';
      c.fillRect(x + 2, y + 2, colW - 4, 2.5);
      // Deep mortar groove
      c.fillStyle = 'rgba(82,54,28,.42)';
      c.fillRect(x, y, colW, 2.2);
      c.fillRect(x, y, 2.2, rowH);
    }
  }

  // Subtle desert weathering gradient (darker sand-eroded base, warm top)
  const weather = c.createLinearGradient(0, 0, 0, h);
  weather.addColorStop(0, 'rgba(255,244,214,.08)');
  weather.addColorStop(.72, 'rgba(120,86,44,.02)');
  weather.addColorStop(1, 'rgba(92,64,32,.24)');
  c.fillStyle = weather;
  c.fillRect(0, 0, w, h);

  if (carved) {
    // Upper royal frieze band (hieroglyphic cartouches + turquoise & gold inlays)
    c.fillStyle = 'rgba(98,68,34,.52)';
    c.fillRect(0, 38, w, 6);
    c.fillRect(0, 120, w, 6);
    c.fillStyle = '#336b6e';
    c.fillRect(0, 44, w, 4);
    c.fillRect(0, 116, w, 4);

    for (let x = 12; x < w; x += 48) {
      // Cartouche frame
      c.fillStyle = '#8b6535';
      c.fillRect(x, 54, 24, 56);
      c.fillStyle = '#cca976';
      c.fillRect(x + 3, 57, 18, 50);
      // Sun disk & Ankh / Scarab glyph
      c.fillStyle = '#d4a64a';
      c.fillRect(x + 9, 62, 6, 6);
      c.fillStyle = '#2f6a6d';
      c.fillRect(x + 10, 74, 4, 24);
      c.fillRect(x + 6, 80, 12, 4);
      c.fillStyle = '#7e5528';
      c.fillRect(x + 7, 100, 10, 3);
    }

    // Mid-height geometric lotus border
    c.fillStyle = 'rgba(104,74,38,.36)';
    c.fillRect(0, 242, w, 4);
    c.fillRect(0, 272, w, 4);
    for (let x = 8; x < w; x += 32) {
      c.fillStyle = x % 64 === 8 ? 'rgba(47,106,109,.44)' : 'rgba(212,166,74,.42)';
      c.fillRect(x, 248, 16, 22);
    }

    // Lower weathered relief band
    c.fillStyle = 'rgba(92,62,32,.34)';
    c.fillRect(0, 344, w, 5);
    c.fillRect(0, 416, w, 5);
    for (let x = 18; x < w; x += 64) {
      c.fillStyle = 'rgba(130,92,48,.36)';
      c.fillRect(x, 358, 30, 48);
      c.fillStyle = 'rgba(52,107,110,.38)';
      c.fillRect(x + 8, 368, 14, 26);
      c.fillStyle = 'rgba(212,166,74,.38)';
      c.fillRect(x + 12, 374, 6, 12);
    }
  }

  sandGrain(c, w, h, seed + 17, 5400);
  return canvasMap(c, textures);
}

// Dedicated Egyptian Tomb Mural texture for spawn chambers & giant mid columns
function muralSkin(accentHex, textures) {
  const w = 512, h = 256, c = sheet(w, h);
  c.fillStyle = '#bfa06e';
  c.fillRect(0, 0, w, h);

  // Outer carved gold & lapis frame
  c.strokeStyle = '#6c4d28';
  c.lineWidth = 14;
  c.strokeRect(7, 7, w - 14, h - 14);
  c.strokeStyle = '#d4a64a';
  c.lineWidth = 5;
  c.strokeRect(16, 16, w - 32, h - 32);

  // Inner colored frieze backdrop
  c.fillStyle = accentHex;
  c.globalAlpha = 0.28;
  c.fillRect(22, 22, w - 44, h - 44);
  c.globalAlpha = 1;

  // Central Winged Sun-Disk (iconic CF Egypt temple motif)
  const cx = w / 2, cy = 88;
  c.fillStyle = '#d4a64a';
  c.beginPath();
  c.arc(cx, cy, 24, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#6b4a20';
  c.lineWidth = 3;
  c.stroke();

  // Symmetrical feathered wings
  for (const s of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      c.fillStyle = row === 1 ? '#2f6a6d' : '#d4a64a';
      c.beginPath();
      c.moveTo(cx + s * 28, cy - 14 + row * 10);
      c.lineTo(cx + s * (168 - row * 18), cy - 26 + row * 14);
      c.lineTo(cx + s * (152 - row * 20), cy - 14 + row * 14);
      c.lineTo(cx + s * 28, cy - 4 + row * 10);
      c.closePath();
      c.fill();
    }
  }

  // Lower hieroglyphic columns & twin stylized Anubis/Pharaoh guardian silhouettes
  c.fillStyle = '#5a3d1e';
  c.fillRect(28, 134, w - 56, 4);
  for (let x = 44; x < w - 44; x += 36) {
    c.fillStyle = x % 72 === 44 ? '#785226' : '#2f6a6d';
    c.fillRect(x, 148, 14, 14);
    c.fillStyle = '#d4a64a';
    c.fillRect(x + 4, 168, 6, 26);
    c.fillRect(x, 174, 14, 4);
    c.fillStyle = '#6a4822';
    c.fillRect(x + 2, 202, 10, 18);
  }

  sandGrain(c, w, h, 409, 2600);
  return canvasMap(c, textures);
}

function crateSkin(textures) {
  const c = sheet(256, 256), r = randomSource(73);
  for (let k = 0; k < 8; k++) {
    c.fillStyle = `hsl(32,36%,${44 + r() * 11}%)`;
    c.fillRect(k * 32, 0, 32, 256);
    c.fillStyle = '#5a432b';
    c.fillRect(k * 32, 0, 2, 256);
    for (let j = 0; j < 70; j++) {
      c.fillStyle = r() > .5 ? 'rgba(62,38,16,.15)' : 'rgba(255,220,165,.12)';
      c.fillRect(k * 32 + r() * 32, r() * 256, 1, 5 + r() * 68);
    }
  }
  c.strokeStyle = '#5c4429';
  c.lineWidth = 26;
  c.strokeRect(8, 8, 240, 240);
  c.strokeStyle = '#a88454';
  c.lineWidth = 16;
  c.strokeRect(8, 8, 240, 240);
  c.beginPath();
  c.moveTo(16, 232);
  c.lineTo(234, 16);
  c.stroke();
  for (const x of [8, 247]) for (const y of [8, 75, 181, 247]) {
    c.fillStyle = '#3b3328';
    c.fillRect(x - 2, y - 2, 4, 4);
  }
  c.fillStyle = '#3a2c1c';
  c.font = 'bold 18px monospace';
  c.fillText('\u2191\u2191', 34, 56);
  c.font = 'bold 12px monospace';
  c.fillText('EGY / 02', 28, 212);
  sandGrain(c, 256, 256, 19, 1400);
  return canvasMap(c, textures);
}

function courtyardSkin(blocks, textures) {
  const w = 1024, h = 2048, c = sheet(w, h), r = randomSource(311);
  c.fillStyle = '#d3b786';
  c.fillRect(0, 0, w, h);

  // Temple sandstone flagstone slabs
  const tw = 64, th = 64;
  for (let y = 0; y < h; y += th) {
    for (let x = 0; x < w; x += tw) {
      const v = Math.floor((r() - .5) * 20);
      c.fillStyle = `rgb(${210 + v},${180 + v},${131 + Math.floor(v * .72)})`;
      c.fillRect(x + 1, y + 1, tw - 2, th - 2);
      c.fillStyle = 'rgba(110,80,46,.26)';
      c.fillRect(x, y, tw, 1.5);
      c.fillRect(x, y, 1.5, th);
    }
  }

  // Wind-blown golden sand drifts & streaks across the temple courtyard
  for (let i = 0; i < 12000; i++) {
    c.fillStyle = r() > .40 ? 'rgba(240,217,170,.19)' : 'rgba(112,82,48,.10)';
    c.fillRect(r() * w, r() * h, 1 + r() * 18, 1 + r() * 3.2);
  }

  // Central cross-courtyard ceremonial paving (iconic mid-sniper lane marker)
  c.fillStyle = 'rgba(155,112,58,.24)';
  c.fillRect(w / 2 - 48, 210, 96, h - 420);
  c.fillRect(110, h / 2 - 42, w - 220, 84);
  // Subtle turquoise/gold trim along the center sniper runner
  c.fillStyle = 'rgba(47,106,109,.22)';
  c.fillRect(w / 2 - 50, 210, 4, h - 420);
  c.fillRect(w / 2 + 46, 210, 4, h - 420);

  // Team spawn chamber stone trim
  c.fillStyle = 'rgba(46,102,134,.38)';
  c.fillRect(36, h - 255, w - 72, 8);
  c.fillStyle = 'rgba(156,70,50,.38)';
  c.fillRect(36, 247, w - 72, 8);

  const sx = w / 29, sz = h / 47;
  for (const b of blocks.filter(b => b.bottom === 0)) {
    const yaw = b.yaw || 0, cos = Math.cos(yaw), sin = Math.sin(yaw);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, e]) => {
      const dx = a * b.w * .5, dz = e * b.d * .5;
      return [(b.x + dx * cos + dz * sin + 14.5) * sx, (b.z + dz * cos - dx * sin + 23.5) * sz];
    });
    c.shadowColor = 'rgba(65,45,22,.42)';
    c.shadowBlur = 10;
    c.shadowOffsetX = 3;
    c.shadowOffsetY = 4;
    c.fillStyle = 'rgba(85,62,36,.22)';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fill();
    c.shadowOffsetX = c.shadowOffsetY = c.shadowBlur = 0;
  }
  return canvasMap(c, textures);
}

/**
 * CF「新金字塔 (Egypt 2.0 / 团队竞技·金字塔)」1:1 复刻版
 *
 * 核心 1:1 还原设计：
 * 1. 紧凑 28.0m × 46.0m 绝对对称古埃及神殿庭院，还原高密度中路对狙与开局手雷交火节奏。
 * 2. 南北封闭古埃及墓室出生点（顶盖、法老石棺祭坛、埃及神殿壁画、火盆暖光），正墙开左/中/右 3 宽门洞防堵家。
 * 3. 中路经典「风化矮墙 + 双巨型莲花柱头壁画石柱 + 中门对狙石缝」，纯石质不可穿掩体为主，全图仅 1 对可穿木箱。
 * 4. CF 版「跳箱身法门槛」立体高点：
 *    - 家前左右狙击高台（高 1.56m，无自动台阶）：支持「一步蹲跳 C+Space」直上，或借 0.82m 垫脚石块「二段跳箱 Space×2」；
 *    - 中场左右 3 级跳攀阶梯小金字塔（每级高差 0.56m > 0.22m STEP，顶高 1.68m）：需连续跳跃登顶掌控全场；
 *    - 侧道转角跳箱偷袭石台（0.78m -> 1.50m）：提供非常规架枪位。
 * 5. 两侧完全落地（y=0）的「双向地面石柱侧道」+ 隔墙标志性「墙洞窗口」(y=1.14..2.35m，可穿射/投雷/对枪)，
 *    彻底移除运输船式单向高架管道。
 */
export function buildPyramidWorld(scene) {
  const headless = !scene;
  const solids = [];
  const vents = [];
  const batches = new Map();
  const materials = new Map();
  const textures = [];
  const geometries = [];
  const preSceneChildren = headless ? null : new Set(scene.children);

  const cube = new T.BoxGeometry(1, 1, 1);
  geometries.push(cube);
  const unit = new T.Object3D();
  const axis = new T.Vector3(0, 1, 0);

  const stoneTex = headless ? null : sandstoneSkin(101, false, textures);
  const carvedTex = headless ? null : sandstoneSkin(205, true, textures);
  const woodTex = headless ? null : crateSkin(textures);
  const muralBlueTex = headless ? null : muralSkin('#285570', textures);
  const muralRedTex = headless ? null : muralSkin('#853c2e', textures);

  function mat(col, opts = {}) {
    if (typeof col !== 'string') return col;
    const key = `${col}_${opts.carved ? 'c' : 's'}_${opts.noMap ? 'n' : 'm'}_${opts.metal || 0}_${opts.rough || .88}`;
    if (!materials.has(key)) {
      const m = new T.MeshStandardMaterial({
        color: col,
        map: opts.noMap ? null : (opts.carved ? carvedTex : stoneTex),
        roughness: opts.rough ?? .88,
        metalness: opts.metal ?? .04,
      });
      materials.set(key, m);
    }
    return materials.get(key);
  }

  function put(x, y, z, w, h, d, color, quat = null, opts = {}) {
    if (headless) return;
    const m = mat(color, opts);
    if (!batches.has(m)) batches.set(m, []);
    unit.position.set(x, y, z);
    unit.scale.set(w, h, d);
    unit.quaternion.identity();
    if (quat) unit.quaternion.copy(quat);
    unit.updateMatrix();
    batches.get(m).push(unit.matrix.clone());
  }

  function solid(x, z, w, d, bottom, top, extra = {}) {
    solids.push({x, z, w, d, bottom, top, ...extra});
  }

  function block(x, z, w, d, bot, top, col, extra = {}, opts = {}) {
    put(x, (bot + top) / 2, z, w, top - bot, d, col, null, opts);
    solid(x, z, w, d, bot, top, extra);
  }

  const woodMat = headless ? null : new T.MeshStandardMaterial({map: woodTex, roughness: .94});
  if (woodMat) materials.set('__wood__', woodMat);
  const goldMat = headless ? null : new T.MeshStandardMaterial({color: '#d4a64a', roughness: .34, metalness: .68});
  if (goldMat) materials.set('__gold__', goldMat);
  const muralBlueMat = headless ? null : new T.MeshStandardMaterial({map: muralBlueTex, roughness: .82, metalness: .08});
  if (muralBlueMat) materials.set('__muralBlue__', muralBlueMat);
  const muralRedMat = headless ? null : new T.MeshStandardMaterial({map: muralRedTex, roughness: .82, metalness: .08});
  if (muralRedMat) materials.set('__muralRed__', muralRedMat);

  const darkBronze = '#4a3828';
  const sandLight = '#dfc494';
  const sandMid = '#cfa870';
  const sandDark = '#9a784c';
  const tombStone = '#b59262';
  const tealTrim = '#2f6a6d';

  function crate(x, z, w, d = w, base = 0, h = w, yaw = 0) {
    const rot = yaw ? new T.Quaternion().setFromAxisAngle(axis, yaw) : null;
    put(x, base + h / 2, z, w, h, d, woodMat, rot);
    solid(x, z, w, d, base, base + h, yaw ? {yaw, material: 'wood'} : {material: 'wood'});
  }

  function obelisk(x, z, w = 1.05, h = 3.9) {
    block(x, z, w, w, 0, h, sandMid, {material: 'stone'}, {carved: true});
    put(x, 0.16, z, w + 0.24, 0.32, w + 0.24, sandDark);
    if (!headless) {
      const capGeo = new T.ConeGeometry(w * .707, w * .92, 4);
      geometries.push(capGeo);
      const cap = new T.Mesh(capGeo, goldMat);
      cap.position.set(x, h + w * .46, z);
      cap.rotation.y = Math.PI / 4;
      cap.castShadow = true;
      cap.receiveShadow = true;
      scene.add(cap);
    }
  }

  // =========================================================================
  // 1. 中央交火区：经典风化矮墙 + 双巨型莲花柱头壁画石柱 + 中门对狙石缝 (纯石质不可穿)
  // =========================================================================
  // 正中央 (0, 0) 标志性风化低矮石墙：高 1.24m（略高于蹲姿身高 1.22m，蹲下完全隐藏头顶躲狙，站立 1.60m 精准卡爆头线，手雷可越墙高抛）
  block(0, 0, 3.0, 0.96, 0, 1.24, sandMid, {material: 'stone'}, {carved: true});
  put(0, 1.28, 0, 3.16, 0.10, 1.08, sandDark);
  put(0, 0.10, 0, 3.14, 0.20, 1.08, sandDark);

  // 中央左右双巨型神殿莲花柱头壁画方柱（x = ±3.8, z = 0），与中央矮墙留出 1.58m 对枪通道
  for (const side of [-1, 1]) {
    const cx = side * 3.8;
    block(cx, 0, 1.44, 1.44, 0, 4.6, sandMid, {material: 'stone'}, {carved: true});
    // 阶梯柱础
    put(cx, 0.16, 0, 1.78, 0.32, 1.78, sandDark);
    put(cx, 0.38, 0, 1.62, 0.16, 1.62, sandLight);
    // 绿松石 + 黄金颈圈饰带
    put(cx, 4.02, 0, 1.52, 0.16, 1.52, tealTrim, null, {noMap: true, roughness: .6});
    put(cx, 4.18, 0, 1.56, 0.12, 1.56, '#d4a64a', null, {noMap: true, metal: .6, rough: .38});
    // 外展莲花柱头（纯视觉装饰，增强埃及神殿宏伟轮廓）
    put(cx, 4.46, 0, 1.76, 0.32, 1.76, sandLight, null, {carved: true});
    put(cx, 4.78, 0, 1.98, 0.32, 1.98, sandDark);
  }

  // 经典中门对狙石缝挡墙（z = ±6.6）：两墙内缘 x = ±1.4 夹出 2.8m 贯穿全图对狙石缝
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      block(side * 2.85, sign * 6.6, 2.9, 1.05, 0, 3.10, sandLight, {material: 'stone'}, {carved: true});
      put(side * 2.85, 3.22, sign * 6.6, 3.06, 0.24, 1.22, sandDark);
      // 挡墙外侧附带低矮石墩（CF 经典闪身卡点对枪）
      block(side * 4.95, sign * 6.6, 1.10, 0.96, 0, 1.08, sandMid, {material: 'stone'});
      put(side * 4.95, 1.12, sign * 6.6, 1.18, 0.08, 1.04, sandDark);
    }
    // 飞翼太阳盘神殿门楣（纯视觉，不挡高抛手雷弧线）
    put(0, 3.48, sign * 6.6, 8.7, 0.72, 1.18, sandMid, null, {carved: true});
    put(0, 3.90, sign * 6.6, 9.0, 0.18, 1.32, sandDark);
    put(0, 3.48, sign * 5.98, 2.6, 0.36, 0.08, '#d4a64a', null, {noMap: true, metal: .65, rough: .35});
    put(0, 3.48, sign * 5.95, 0.56, 0.44, 0.10, tealTrim, null, {noMap: true, roughness: .5});

    // 中路前压纯石质方形掩体（回归 CF 纯石质刚枪与躲雷手感）
    block(sign * 4.6, sign * 3.2, 1.30, 1.20, 0, 1.24, sandMid, {material: 'stone'}, {carved: true});
    block(-sign * 4.6, sign * 3.2, 1.30, 1.20, 0, 1.24, sandMid, {material: 'stone'}, {carved: true});
  }

  // =========================================================================
  // 2. 中场左右对称「CF 跳攀阶梯小金字塔」(x = ±7.55, z = 0)
  // 3 级跳箱台阶，每级高差 0.56m (> 0.22m STEP)，需连续跳跃 (Space) 或蹲跳 (C+Space) 登顶 (1.68m)
  // =========================================================================
  const miniTiers = [
    {size: 3.90, bot: 0.00, top: 0.56, col: sandLight, carved: false},
    {size: 2.70, bot: 0.56, top: 1.12, col: sandMid, carved: false},
    {size: 1.56, bot: 1.12, top: 1.68, col: sandLight, carved: true},
  ];
  for (const side of [-1, 1]) {
    const px = side * 7.55;
    for (const tier of miniTiers) {
      block(px, 0, tier.size, tier.size, tier.bot, tier.top, tier.col, {walkSurface: true, material: 'stone'}, {carved: tier.carved});
      // 每级台阶边缘浅金镶边，强化跳点高度辨识
      put(px, tier.top - 0.03, 0, tier.size + 0.04, 0.05, tier.size + 0.04, sandDark);
    }
    // 顶层金色祭坛台面饰边（保持中心 1.56×1.56 完整可站立，不卡脚）
    put(px, 1.71, 0, 1.62, 0.06, 1.62, '#d4a64a', null, {noMap: true, metal: .55, rough: .42});
  }

  // =========================================================================
  // 3. 家前左右「CF 跳箱狙击高台」(x = ±7.3, z = ±11.4，高 1.56m，无自动台阶)
  // 两种上台身法：
  //   ① 一步蹲跳 (C + Space，起跳高度 ~1.96m) 直接登顶 1.56m 主高台
  //   ② 二段跳箱 (Space 连跳)：先跳上 0.82m 垫脚石块，再跳上 1.56m 主高台
  // =========================================================================
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const dx = side * 7.3;
      const dz = sign * 11.4;
      // 1.56m 高主狙击石台（纯石质不可穿）
      block(dx, dz, 2.4, 2.2, 0, 1.56, sandMid, {walkSurface: true, material: 'stone'}, {carved: true});
      put(dx, 1.53, dz, 2.48, 0.08, 2.28, sandDark);
      // 高台前沿 0.80m 半身石护墙（顶高 2.36m：站立露头胸架中路/边路，下蹲可掩体躲狙）
      block(dx, dz - sign * 0.98, 2.4, 0.24, 1.56, 2.36, sandDark, {material: 'stone'});
      put(dx, 2.40, dz - sign * 0.98, 2.52, 0.08, 0.30, '#d4a64a', null, {noMap: true, metal: .5, rough: .45});
      // 己方侧 0.82m 垫脚跳箱石块（二段跳箱身法门槛）
      block(dx, dz + sign * 1.75, 1.20, 1.15, 0, 0.82, sandLight, {walkSurface: true, material: 'stone'});
      put(dx, 0.80, dz + sign * 1.75, 1.24, 0.05, 1.19, '#d4a64a', null, {noMap: true, metal: .45, rough: .48});
    }
  }

  // =========================================================================
  // 4. 两侧「双向地面石柱侧道」+ 隔墙标志性「CF 墙洞窗口」(x ∈ [±10.9, ±14.0], y = 0)
  // 彻底移除运输船式单向高架管道，还原 CF 金字塔双向地面侧道 + 墙洞对枪 + 跳箱偷袭石台
  // =========================================================================
  for (const side of [-1, 1]) {
    const colX = side * 10.65;
    for (const sign of [-1, 1]) {
      // 中段隔墙 z ∈ [±2.4, ±6.8]：在 z = ±4.6 处开设 1.8m 宽标志性「CF 墙洞窗口」(y = 1.14..2.35m)
      // 两侧实体石柱（z ∈ [±2.4, ±3.7] 与 [±5.5, ±6.8]）
      block(colX, sign * 3.05, 0.50, 1.30, 0, 3.40, sandLight, {material: 'stone'}, {carved: true});
      block(colX, sign * 6.15, 0.50, 1.30, 0, 3.40, sandLight, {material: 'stone'}, {carved: true});
      // 墙洞下窗台 (0..1.22m，蹲姿完全隐蔽、站姿 1.60m 穿窗对枪/投雷) 与上过梁 (2.35..3.40m)
      block(colX, sign * 4.60, 0.50, 1.80, 0, 1.22, sandMid, {material: 'stone'}, {carved: true});
      block(colX, sign * 4.60, 0.50, 1.80, 2.35, 3.40, sandLight, {material: 'stone'}, {carved: true});
      put(colX, 1.24, sign * 4.60, 0.62, 0.08, 1.84, sandDark);
      put(colX, 2.34, sign * 4.60, 0.62, 0.08, 1.84, '#d4a64a', null, {noMap: true, metal: .48, rough: .46});
      put(colX, 3.54, sign * 4.60, 0.72, 0.28, 4.56, sandDark);

      // 后段隔墙 z ∈ [±9.8, ±13.8]
      block(colX, sign * 11.8, 0.50, 4.0, 0, 3.40, sandLight, {material: 'stone'}, {carved: true});
      put(colX, 3.54, sign * 11.8, 0.72, 0.28, 4.16, sandDark);
      // 侧翼拱门顶梁（纯视觉，不挡通行与手雷）
      put(colX, 3.42, sign * 8.3, 0.58, 0.46, 3.1, sandDark);

      // 双向侧道中段纯石质矮掩体（1.22m 蹲姿完全隐蔽，闪身对枪，内侧留 1.6m 宽通道）
      block(side * 12.85, sign * 3.8, 1.25, 1.05, 0, 1.22, sandMid, {material: 'stone'}, {carved: true});

      // 侧道转角「跳箱偷袭石台」：0.78m 垫脚石 -> 1.50m 高架枪石块（支持二段跳或 C+Space 一步蹲跳）
      block(side * 13.15, sign * 8.3, 1.25, 1.25, 0, 1.50, sandMid, {walkSurface: true, material: 'stone'}, {carved: true});
      block(side * 13.15, sign * 9.55, 1.05, 1.05, 0, 0.78, sandLight, {walkSurface: true, material: 'stone'});
      put(side * 13.15, 0.76, sign * 9.55, 1.09, 0.05, 1.09, '#d4a64a', null, {noMap: true, metal: .45, rough: .48});
    }
    // 中场拱门顶梁（z = 0 处双向连通小金字塔与侧道）
    put(colX, 3.42, 0, 0.58, 0.48, 4.9, sandDark);
  }

  // Ground-level side corridor flank waypoints for AI flankers & tactical map indicators
  vents.push({entry: {x: -11.8, z: -15.0}, exit: {x: -11.8, z: 9.0}});
  vents.push({entry: {x: 11.8, z: 15.0}, exit: {x: 11.8, z: -9.0}});

  // =========================================================================
  // 5. 家前石墩掩体、外庭院方尖碑 & 极少木箱穿点（全图仅 1 对可穿木箱）
  // =========================================================================
  for (const sign of [-1, 1]) {
    // 家门口经典「②号点」纯石质石墩掩体（不可穿，稳健卡中门/过点狙）
    for (const side of [-1, 1]) {
      block(side * 4.5, sign * 14.4, 1.55, 1.08, 0, 1.32, sandMid, {material: 'stone'}, {carved: true});
      put(side * 4.5, 1.36, sign * 14.4, 1.65, 0.08, 1.16, sandDark);
    }

    // 侧道入口外侧装饰方尖碑（纯石质硬掩体 + 视觉地标，不堵三门洞）
    obelisk(sign * 13.2, sign * 15.6, 1.05, 3.9);
    obelisk(-sign * 13.2, sign * 15.6, 1.05, 3.9);
  }

  // 全图仅保留 1 对对称可穿射木箱 (material: 'wood')，位于中路-侧翼过渡斜角，极少穿点
  crate(4.2, 10.6, 1.32, 1.32, 0, 1.28, 0.22);
  crate(-4.2, -10.6, 1.32, 1.32, 0, 1.28, -0.22);

  // =========================================================================
  // 6. 南北封闭古埃及墓室出生点（壁画、法老石棺祭坛、顶盖、3 宽门洞防堵家）
  // Team 0: z ∈ [17.8, 22.8] | Team 1: z ∈ [-22.8, -17.8]
  // =========================================================================
  for (const sign of [-1, 1]) {
    const wallZ = sign * 17.4;
    const chamberRoofY = 3.85;
    const teamMuralMat = sign > 0 ? muralBlueMat : muralRedMat;

    // 墓室前墙：开 3 个门洞防堵家，同时加宽实墙遮蔽确保出生点零暴露——左门 [-12.4, -9.8]、中门 [-1.6, 1.6]、右门 [9.8, 12.4]
    for (const side of [-1, 1]) {
      // 外柱段 [-14.0, -12.4] 与 [12.4, 14.0]
      block(side * 13.2, wallZ, 1.6, 0.85, 0, chamberRoofY, tombStone, {material: 'stone'}, {carved: true});
      // 中左实墙 [-9.8, -1.6] 与中右实墙 [1.6, 9.8]（8.2m 宽实墙彻底遮蔽 8 个出生点）
      block(side * 5.7, wallZ, 8.2, 0.85, 0, chamberRoofY, tombStone, {material: 'stone'}, {carved: true});
      // 墓室正门外侧塔门浮雕立柱装饰
      put(side * 1.85, 1.92, wallZ - sign * 0.48, 0.56, 3.84, 0.24, sandDark);
      put(side * 9.55, 1.92, wallZ - sign * 0.48, 0.52, 3.84, 0.22, sandDark);
    }
    // 三门上方门楣横梁（底高 3.05m，顶部与墓室屋顶平齐）
    put(0, 3.45, wallZ, 28.0, 0.80, 0.96, sandDark, null, {carved: true});
    // 中门埃及飞翼太阳盘装饰 + 阵营徽章
    put(0, 3.44, wallZ - sign * 0.50, 4.2, 0.44, 0.10, sign > 0 ? '#2b5e7c' : '#8e3f2f', null, {noMap: true});
    put(0, 3.44, wallZ - sign * 0.56, 1.2, 0.50, 0.12, '#d4a64a', null, {noMap: true, metal: .65, rough: .35});

    // 封闭墓室顶盖（z ∈ [17.2, 23.4]），营造古埃及法老陵墓氛围
    block(0, sign * 20.3, 28.0, 6.2, chamberRoofY, chamberRoofY + 0.55, sandDark, {material: 'stone'});
    // 墓室顶外沿女儿墙齿垛装饰
    for (let x = -12.6; x <= 12.6; x += 2.8) {
      put(x, chamberRoofY + 0.82, sign * 17.35, 1.4, 0.54, 0.42, sandMid);
    }

    // 墓室内后墙中央「法老石棺祭坛」（z = ±22.15，不阻挡 8 个出生点）
    block(0, sign * 22.15, 2.8, 1.15, 0, 0.32, sandDark, {material: 'stone'});
    block(0, sign * 22.15, 2.3, 0.92, 0.32, 0.92, tombStone, {material: 'stone'}, {carved: true});
    // 金色法老石棺盖板与徽饰
    put(0, 0.98, sign * 22.15, 2.15, 0.14, 0.82, '#d4a64a', null, {noMap: true, metal: .62, rough: .38});
    put(0, 1.07, sign * 22.15, 0.42, 0.08, 0.66, tealTrim, null, {noMap: true, roughness: .45});

    // 墓室内巨幅古埃及神殿壁画（使用专用壁画纹理 muralSkin）
    if (!headless) {
      const muralGeo = new T.PlaneGeometry(7.2, 2.1);
      geometries.push(muralGeo);
      const muralMesh = new T.Mesh(muralGeo, teamMuralMat);
      muralMesh.position.set(0, 2.42, sign * 22.92);
      if (sign > 0) muralMesh.rotation.y = Math.PI;
      scene.add(muralMesh);
    }

    // 外围神殿围墙
    block(0, sign * 23.4, 29.0, 0.8, 0, 5.4, sandLight, {material: 'stone'}, {carved: true});
    put(0, 5.58, sign * 23.4, 29.4, 0.36, 1.02, sandDark);
    block(sign * 14.35, 0, 0.7, 47.6, 0, 5.0, sandLight, {material: 'stone'}, {carved: true});
    put(sign * 14.35, 5.18, 0, 0.92, 0.36, 47.8, sandDark);
    for (let z = -20.0; z <= 20.0; z += 5.7) {
      put(sign * 14.58, 2.55, z, 0.65, 5.3, 1.15, sandDark);
    }
  }

  // =========================================================================
  // 7. 出生点 (每队 8 个，全部位于 8.2m 宽墓室实墙后方，杜绝出生即在枪线上) & AI 战术点
  // 墓室前实墙覆盖 x ∈ [-9.8, -1.6] 与 [1.6, 9.8]，所有出生点均深藏实墙掩体后
  // =========================================================================
  const team0Spawns = [];
  const team1Spawns = [];
  for (const zOff of [19.4, 21.1]) {
    for (const x of [-6.8, -4.8, 4.8, 6.8]) {
      team0Spawns.push({x, z: zOff, y: 0, yaw: 0});
      team1Spawns.push({x, z: -zOff, y: 0, yaw: Math.PI});
    }
  }
  const spawns = [team0Spawns, team1Spawns];

  const bounds = {minX: -14.0, maxX: 14.0, minZ: -23.0, maxZ: 23.0};
  const ai = {
    lanes: [-11.8, 0, 11.8],
    spawnZoneZ: [16.2, -16.2],
    snipers: [
      [
        {x: 0, z: 12.6, yaw: 0},          // 中门前庭经典对狙位
        {x: -4.5, z: 15.6, yaw: 0.12},    // 左翼石墩②号点架枪位
        {x: 11.8, z: 13.6, yaw: -0.05},   // 右翼地面侧道架枪位
      ],
      [
        {x: 0, z: -12.6, yaw: Math.PI},
        {x: 4.5, z: -15.6, yaw: Math.PI + 0.12},
        {x: -11.8, z: -13.6, yaw: Math.PI - 0.05},
      ],
    ],
  };

  if (headless) {
    return {id: 'pyramid', bounds, spawns, solids, vents, ai};
  }

  // =========================================================================
  // 8. 3D 渲染环境：庭院铺地、荒漠沙丘、吉萨大金字塔群、狮身人面像、黄沙微粒、火盆与天空
  // =========================================================================
  const floorGeo = new T.PlaneGeometry(29, 47);
  const floorMat = new T.MeshStandardMaterial({map: courtyardSkin(solids, textures), roughness: .94});
  geometries.push(floorGeo);
  materials.set('__floor__', floorMat);
  const floor = new T.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 周围起伏荒漠沙丘
  const desertGeo = new T.PlaneGeometry(660, 660, 32, 32);
  const posAttr = desertGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const px = posAttr.getX(i), pz = posAttr.getY(i);
    if (Math.hypot(px, pz) > 34) {
      const wave = Math.sin(px * .034) * Math.cos(pz * .028) * 3.4 + Math.sin((px + pz) * .017) * 2.5;
      posAttr.setZ(i, wave);
    }
  }
  desertGeo.computeVertexNormals();
  const desertMat = new T.MeshStandardMaterial({color: '#d9b77c', roughness: .98});
  geometries.push(desertGeo);
  materials.set('__desert__', desertMat);
  const desert = new T.Mesh(desertGeo, desertMat);
  desert.rotation.x = -Math.PI / 2;
  desert.position.y = -0.35;
  desert.receiveShadow = true;
  scene.add(desert);

  // 远景吉萨大金字塔群（含石灰岩顶冠层次）
  const bgPyrMat = new T.MeshStandardMaterial({color: '#caa56e', roughness: .95});
  const bgPyrCapMat = new T.MeshStandardMaterial({color: '#e5cfa2', roughness: .88});
  materials.set('__bgPyr__', bgPyrMat);
  materials.set('__bgPyrCap__', bgPyrCapMat);
  for (const [px, pz, rad, ht] of [[-86, -118, 62, 52], [86, -106, 48, 40], [98, 92, 52, 44], [-96, 98, 40, 34]]) {
    const pGeo = new T.ConeGeometry(rad, ht, 4);
    geometries.push(pGeo);
    const pMesh = new T.Mesh(pGeo, bgPyrMat);
    pMesh.position.set(px, ht * .5 - 0.5, pz);
    pMesh.rotation.y = Math.PI / 4;
    scene.add(pMesh);

    const capGeo = new T.ConeGeometry(rad * .22, ht * .22, 4);
    geometries.push(capGeo);
    const capMesh = new T.Mesh(capGeo, bgPyrCapMat);
    capMesh.position.set(px, ht * .89 - 0.5, pz);
    capMesh.rotation.y = Math.PI / 4;
    scene.add(capMesh);
  }

  // 远景标志性狮身人面像（Sphinx）剪影体块（位于东侧荒漠地平线）
  put(62, 4.5, -18, 12, 9, 26, '#c29c64');
  put(62, 12.2, -9, 7.5, 7.2, 8.2, '#c8a36b');
  put(62, 13.0, -9, 10.6, 5.5, 4.2, '#b9925c'); // Nemes headdress wings
  put(62, 2.2, -3, 3.2, 4.4, 12, '#c29c64');    // Front paws

  // 墓室门口与石棺两侧火盆（动态火焰）
  const brazierFlames = [];
  const flameGeo = new T.ConeGeometry(0.22, 0.62, 6);
  const flameMat = new T.MeshBasicMaterial({color: '#ff9b38'});
  geometries.push(flameGeo);
  materials.set('__flame__', flameMat);
  const brazierCoords = [
    [-2.95, -16.45], [2.95, -16.45],
    [-2.95, 16.45], [2.95, 16.45],
    [-2.05, -22.15], [2.05, -22.15],
    [-2.05, 22.15], [2.05, 22.15],
  ];
  for (const [sx, sz] of brazierCoords) {
    put(sx, 0.72, sz, 0.68, 1.44, 0.68, darkBronze, null, {noMap: true, metal: .45, rough: .55});
    put(sx, 1.50, sz, 0.84, 0.20, 0.84, '#b88c46', null, {noMap: true, metal: .5, rough: .45});
    const fl = new T.Mesh(flameGeo, flameMat);
    fl.position.set(sx, 1.88, sz);
    scene.add(fl);
    brazierFlames.push(fl);
  }
  // 封闭墓室内暖金火光补光
  for (const sz of [-20.4, 20.4]) {
    const torchLight = new T.PointLight(0xffb45c, 5.0, 18, 1.35);
    torchLight.position.set(0, 3.1, sz);
    scene.add(torchLight);
  }

  // 合并静态几何体 InstancedMesh
  for (const [material, matrices] of batches) {
    const mesh = new T.InstancedMesh(cube, material, matrices.length);
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // 飘浮黄沙微粒（还原 CF 新金字塔沙漠风沙氛围）
  const dustCount = 220;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustRng = randomSource(907);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (dustRng() - 0.5) * 30;
    dustPositions[i * 3 + 1] = 0.4 + dustRng() * 5.6;
    dustPositions[i * 3 + 2] = (dustRng() - 0.5) * 46;
  }
  const dustGeo = new T.BufferGeometry();
  dustGeo.setAttribute('position', new T.BufferAttribute(dustPositions, 3));
  const dustMat = new T.PointsMaterial({color: '#f2d7a4', size: 0.09, transparent: true, opacity: 0.45, depthWrite: false});
  geometries.push(dustGeo);
  materials.set('__dust__', dustMat);
  const dustPoints = new T.Points(dustGeo, dustMat);
  scene.add(dustPoints);

  // 光照与天空穹顶
  const sky = new T.Color('#d4c7b0');
  scene.fog = new T.FogExp2(sky, 0.0046);
  scene.background = sky;

  const sun = new T.DirectionalLight(0xffe7bd, 2.35);
  sun.position.set(-40, 44, -44);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -34, right: 34, top: 34, bottom: -34, near: 10, far: 130});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const hemi = new T.HemisphereLight(0xe8f3ff, 0xc9a576, 1.24);
  scene.add(hemi);

  const dusk = {value: 0};
  const skyGeo = new T.SphereGeometry(390, 32, 20);
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: {dusk},
    vertexShader: 'varying vec3 v; void main(){ v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec3 v; uniform float dusk;
      void main(){
        vec3 n = normalize(v);
        vec3 s = normalize(vec3(-.62, mix(.50, .18, dusk), -.58));
        float h = max(n.y, 0.0);
        float d = max(dot(n, s), 0.0);
        vec3 dayCol = mix(vec3(.90, .81, .65), vec3(.22, .48, .73), pow(h, .52));
        dayCol += vec3(.44, .26, .08) * pow(d, 8.0);
        dayCol += vec3(.96, .86, .62) * smoothstep(.9982, .9996, d);
        vec3 duskCol = mix(vec3(.90, .43, .22), vec3(.16, .13, .34), pow(h, .55));
        duskCol += vec3(.86, .36, .10) * pow(d, 6.0);
        duskCol += vec3(1.0, .62, .28) * smoothstep(.9978, .9995, d);
        gl_FragColor = vec4(mix(dayCol, duskCol, dusk), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  geometries.push(skyGeo);
  materials.set('__sky__', skyMat);
  scene.add(new T.Mesh(skyGeo, skyMat));

  // 盘旋沙漠鹰
  const wingGeo = new T.BufferGeometry();
  wingGeo.setAttribute('position', new T.Float32BufferAttribute(
    [-.08, .01, .16, .75, .16, -.06, .42, .08, -.14, .42, .08, -.14, .75, .16, -.06, 1.02, .04, -.15], 3
  ));
  wingGeo.computeVertexNormals();
  const wingMat = new T.MeshBasicMaterial({color: '#4e3c2c', side: T.DoubleSide});
  geometries.push(wingGeo);
  materials.set('__wing__', wingMat);
  const birds = [];
  for (let i = 0; i < 6; i++) {
    const body = new T.Group(), wings = [];
    for (const s of [-1, 1]) {
      const wing = new T.Mesh(wingGeo, wingMat);
      wing.scale.x = s;
      body.add(wing);
      wings.push(wing);
    }
    body.scale.setScalar(0.68 + (i % 3) * 0.14);
    scene.add(body);
    birds.push({body, wings});
  }

  const fx = makeEffects(scene);

  function setTime(mode) {
    const late = mode === 'dusk';
    dusk.value = late ? 1 : 0;
    sun.color.set(late ? '#ff9352' : '#ffe7bd');
    sun.intensity = late ? 1.80 : 2.35;
    sun.position.set(-40, late ? 18 : 44, -44);
    sun.shadow.needsUpdate = true;
    hemi.color.set(late ? '#b09cc4' : '#e8f3ff');
    hemi.groundColor.set(late ? '#805a46' : '#c9a576');
    hemi.intensity = late ? 1.05 : 1.24;
    sky.set(late ? '#c78462' : '#d4c7b0');
    scene.fog.color.copy(sky);
    scene.fog.density = late ? 0.0070 : 0.0046;
    dustMat.color.set(late ? '#f0a672' : '#f2d7a4');
  }

  function setQuality(level) {
    const px = {low: 512, medium: 1024, high: 2048}[level] || 1024;
    sun.castShadow = level !== 'low';
    sun.shadow.mapSize.set(px, px);
    if (sun.shadow.map && sun.shadow.map.width !== px) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    sun.shadow.needsUpdate = true;
    fx.setQuality(level);
    dustPoints.visible = level !== 'low';
    birds.forEach(({body}, i) => {
      body.visible = i < (level === 'low' ? 2 : level === 'medium' ? 4 : 6);
    });
  }

  setTime('day');
  let lastTime = 0;

  function update(timeSeconds, dt) {
    dt = Number.isFinite(dt) ? dt : Math.max(0, Math.min(0.06, timeSeconds - lastTime));
    lastTime = timeSeconds;
    fx.update(dt);
    brazierFlames.forEach((fl, idx) => {
      const s = 0.88 + Math.sin(timeSeconds * 11 + idx * 1.7) * 0.14;
      fl.scale.set(s, 0.85 + Math.cos(timeSeconds * 15 + idx) * 0.22, s);
      fl.rotation.y = timeSeconds * 2.5 + idx;
    });
    if (dustPoints.visible) {
      const pos = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        let x = pos[i * 3] + dt * 1.15;
        let z = pos[i * 3 + 2] + dt * 0.42;
        if (x > 15) x = -15;
        if (z > 23) z = -23;
        pos[i * 3] = x;
        pos[i * 3 + 2] = z;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }
    birds.forEach(({body, wings}, i) => {
      if (!body.visible) return;
      const t = timeSeconds * 0.075 + i * 1.3;
      body.position.set(Math.cos(t) * (17 + i * 1.4), 14 + i * 0.65 + Math.sin(t * 2) * 0.6, Math.sin(t) * (22 + i * 0.8));
      body.rotation.y = -t;
      const flap = 0.14 + Math.sin(timeSeconds * 4.5 + i) * 0.34;
      wings[0].rotation.z = -flap;
      wings[1].rotation.z = flap;
    });
  }

  function dispose() {
    if (sun.shadow && sun.shadow.map) sun.shadow.map.dispose();
    for (const child of [...scene.children]) {
      if (!preSceneChildren.has(child)) {
        scene.remove(child);
        if (child.traverse) {
          child.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
              if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
              else obj.material.dispose();
            }
          });
        }
      }
    }
    for (const g of geometries) g.dispose();
    for (const m of materials.values()) m.dispose();
    for (const tex of textures) tex.dispose();
    materials.clear();
    batches.clear();
    textures.length = 0;
    geometries.length = 0;
  }

  return {
    id: 'pyramid',
    bounds,
    spawns,
    solids,
    vents,
    ai,
    menuCamera: {pos: [13.2, 9.8, 17.6], lookAt: [0, 1.8, -2.0]},
    fx,
    setTime,
    setQuality,
    update,
    dispose,
  };
}
