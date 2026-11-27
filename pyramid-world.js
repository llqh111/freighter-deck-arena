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
    c.fillStyle = r() > .45 ? 'rgba(84,56,28,.12)' : 'rgba(255,241,206,.13)';
    c.fillRect(x, y, .7 + r() * 2.2, .7 + r() * 2.2);
  }
}

// Egyptian sandstone masonry with optional carved hieroglyphic frieze & turquoise/gold accents.
function sandstoneSkin(seed, carved, textures) {
  const w = 512, h = 512, c = sheet(w, h), r = randomSource(seed);
  c.fillStyle = carved ? '#c8ab7c' : '#d5ba8b';
  c.fillRect(0, 0, w, h);

  const rows = 8, rowH = h / rows;
  for (let row = 0; row < rows; row++) {
    const y = row * rowH;
    const cols = 4, colW = w / cols, offset = (row % 2) * (colW * .5);
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const shade = Math.floor((r() - .5) * 20);
      c.fillStyle = `rgb(${210 + shade},${180 + shade},${132 + Math.floor(shade * .75)})`;
      c.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      c.fillStyle = 'rgba(255,245,218,.22)';
      c.fillRect(x + 2, y + 2, colW - 4, 2);
      c.fillStyle = 'rgba(88,60,32,.38)';
      c.fillRect(x, y, colW, 2);
      c.fillRect(x, y, 2, rowH);
    }
  }

  if (carved) {
    // Upper frieze band (hieroglyphic cartouches + turquoise inlays)
    c.fillStyle = 'rgba(104,74,38,.48)';
    c.fillRect(0, 42, w, 6);
    c.fillRect(0, 118, w, 6);
    c.fillStyle = '#8f6938';
    for (let x = 14; x < w; x += 48) {
      c.fillRect(x, 56, 22, 52);
      c.fillStyle = '#c8ab7c';
      c.fillRect(x + 4, 62, 14, 14);
      // Ankh / scarab motif
      c.fillStyle = '#386f72';
      c.fillRect(x + 8, 82, 6, 18);
      c.fillRect(x + 5, 86, 12, 4);
      c.fillStyle = '#d4a64a';
      c.fillRect(x + 9, 66, 4, 6);
      c.fillStyle = '#8f6938';
    }
    // Lower weathered relief band
    c.fillStyle = 'rgba(92,62,32,.32)';
    c.fillRect(0, 340, w, 5);
    c.fillRect(0, 410, w, 5);
    for (let x = 20; x < w; x += 64) {
      c.fillStyle = 'rgba(130,92,48,.34)';
      c.fillRect(x, 355, 28, 44);
      c.fillStyle = 'rgba(56,111,114,.35)';
      c.fillRect(x + 8, 365, 12, 24);
    }
  }

  sandGrain(c, w, h, seed + 17, 4800);
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

  const tw = 64, th = 64;
  for (let y = 0; y < h; y += th) {
    for (let x = 0; x < w; x += tw) {
      const v = Math.floor((r() - .5) * 18);
      c.fillStyle = `rgb(${210 + v},${180 + v},${132 + Math.floor(v * .72)})`;
      c.fillRect(x + 1, y + 1, tw - 2, th - 2);
      c.fillStyle = 'rgba(110,80,46,.24)';
      c.fillRect(x, y, tw, 1.5);
      c.fillRect(x, y, 1.5, th);
    }
  }

  // Sand drifts & wind streaks across the temple courtyard
  for (let i = 0; i < 10500; i++) {
    c.fillStyle = r() > .42 ? 'rgba(238,214,168,.17)' : 'rgba(112,82,48,.10)';
    c.fillRect(r() * w, r() * h, 1 + r() * 16, 1 + r() * 3);
  }

  // Central cross-courtyard ceremonial paving (iconic mid-sniper lane marker)
  c.fillStyle = 'rgba(155,112,58,.24)';
  c.fillRect(w / 2 - 46, 220, 92, h - 440);
  c.fillRect(140, h / 2 - 42, w - 280, 84);

  // Team spawn chamber stone trim
  c.fillStyle = 'rgba(46,102,134,.36)';
  c.fillRect(42, h - 245, w - 84, 8);
  c.fillStyle = 'rgba(156,70,50,.36)';
  c.fillRect(42, 237, w - 84, 8);

  const sx = w / 30, sz = h / 54;
  for (const b of blocks.filter(b => b.bottom === 0)) {
    const yaw = b.yaw || 0, cos = Math.cos(yaw), sin = Math.sin(yaw);
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, e]) => {
      const dx = a * b.w * .5, dz = e * b.d * .5;
      return [(b.x + dx * cos + dz * sin + 15) * sx, (b.z + dz * cos - dx * sin + 27) * sz];
    });
    c.shadowColor = 'rgba(65,45,22,.40)';
    c.shadowBlur = 10;
    c.shadowOffsetX = 3;
    c.shadowOffsetY = 4;
    c.fillStyle = 'rgba(85,62,36,.20)';
    c.beginPath();
    pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
    c.closePath();
    c.fill();
    c.shadowOffsetX = c.shadowOffsetY = c.shadowBlur = 0;
  }
  return canvasMap(c, textures);
}

/**
 * CF「新金字塔 (Egypt 2.0)」1:1 风格团队竞技地图
 *
 * 核心还原特征：
 * 1. 南北封闭古埃及壁画出生石室（含顶盖、法老石棺祭坛、火盆），正墙开左/中/右 3 门洞防堵家。
 * 2. 正中贯穿南北的标志性「中门对狙石缝」（Mid Sniper Slit）与中央风化矮墙 + 双巨型壁画石柱。
 * 3. 中场左右对称两座可攀爬「阶梯小金字塔」（每级高差 0.20m <= 0.22m），兼顾立体高台与中路视野。
 * 4. 两侧「Egypt 2.0 防堵家采光回廊暗道」（vents）与家前双侧狙击高台/石墩掩体。
 * 5. 对称可穿箱补给木箱（material: 'wood'）与远景吉萨大金字塔群 + 狮身人面像轮廓。
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

  const darkBronze = '#4a3828';
  const sandLight = '#dfc494';
  const sandMid = '#cfa870';
  const sandDark = '#9a784c';
  const tombStone = '#b59262';
  const tealTrim = '#36696b';

  function crate(x, z, w, d = w, base = 0, h = w, yaw = 0) {
    const rot = yaw ? new T.Quaternion().setFromAxisAngle(axis, yaw) : null;
    put(x, base + h / 2, z, w, h, d, woodMat, rot);
    solid(x, z, w, d, base, base + h, yaw ? {yaw, material: 'wood'} : {material: 'wood'});
  }

  function obelisk(x, z, w = 1.25, h = 4.2) {
    block(x, z, w, w, 0, h, sandMid, {material: 'stone'}, {carved: true});
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
  // 1. 中央交火区：经典十字矮墙 + 双巨型壁画石柱 + 中门对狙石缝 (Mid Sniper Slit)
  // =========================================================================
  // 正中央 (0, 0) 标志性风化低矮石墙：高 1.04m（蹲下完全隐蔽，站立可卡爆头线对枪）
  block(0, 0, 2.8, 0.96, 0, 1.04, sandMid, {material: 'stone'}, {carved: true});
  put(0, 1.08, 0, 2.94, 0.10, 1.06, sandDark);

  // 中央左右双巨型神殿壁画方柱（x = ±3.85, z = 0），与中央矮墙之间各留 1.7m 通道
  for (const side of [-1, 1]) {
    block(side * 3.85, 0, 1.48, 1.48, 0, 4.5, sandMid, {material: 'stone'}, {carved: true});
    put(side * 3.85, 4.68, 0, 1.82, 0.36, 1.82, sandDark);
    put(side * 3.85, 0.18, 0, 1.76, 0.36, 1.76, sandDark);
  }

  // 经典中门对狙石缝挡墙（z = ±7.2）：两墙相距 2.6m（x ∈ [-1.3, 1.3] 形成贯穿全图对狙石缝）
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      block(side * 2.55, sign * 7.2, 2.5, 1.05, 0, 3.15, sandLight, {material: 'stone'}, {carved: true});
      put(side * 2.55, 3.28, sign * 7.2, 2.68, 0.24, 1.22, sandDark);
      // 挡墙外侧附带低矮石墩（蹲姿卡点对枪）
      block(side * 4.35, sign * 7.2, 1.05, 0.95, 0, 1.12, sandMid, {material: 'stone'});
    }
    // 对狙石缝上方横跨神殿飞翼门楣（高度 3.15~3.85，不影响视野且增强纵深构图）
    put(0, 3.50, sign * 7.2, 7.6, 0.70, 1.15, sandMid, null, {carved: true});
    put(0, 3.50, sign * 6.58, 2.1, 0.34, 0.08, '#d4a64a', null, {noMap: true, metal: .65, rough: .35});
  }

  // =========================================================================
  // 2. 中场左右对称「阶梯小金字塔」(x = ±8.2, z = 0)
  // 5 级同心台阶，每级高差 0.20m (<= 0.22m STEP)，踏面深 0.45m，顶层高 1.00m
  // =========================================================================
  const miniTiers = 5;
  const miniRise = 0.20;
  const miniTread = 0.45;
  const miniTop = 1.40;
  for (const side of [-1, 1]) {
    const px = side * 8.2;
    for (let i = 0; i < miniTiers; i++) {
      const level = i + 1;
      const sz = miniTop + (miniTiers - level) * (miniTread * 2); // 底座 5.0m -> 顶层 1.4m
      block(px, 0, sz, sz, i * miniRise, level * miniRise, i % 2 === 0 ? sandLight : sandMid, {walkSurface: true, material: 'stone'}, {carved: i === miniTiers - 1});
    }
    // 金字塔顶中心装饰矮方尖碑（0.52m 宽，留出环绕站立空间）
    block(px, 0, 0.52, 0.52, 1.00, 1.55, sandDark, {material: 'stone'});
    if (!headless) {
      const tipGeo = new T.ConeGeometry(0.36, 0.44, 4);
      geometries.push(tipGeo);
      const tip = new T.Mesh(tipGeo, goldMat);
      tip.position.set(px, 1.55 + 0.22, 0);
      tip.rotation.y = Math.PI / 4;
      tip.castShadow = true;
      scene.add(tip);
    }
  }

  // =========================================================================
  // 3. 对称可穿箱木箱掩体 (material: 'wood') 与边路砂岩断墙/方尖碑
  // =========================================================================
  for (const sign of [-1, 1]) {
    // 中路前压斜角可穿箱木箱
    crate(sign * 5.2, sign * 3.9, 1.38, 1.38, 0, 1.32);
    crate(-sign * 5.2, sign * 3.9, 1.38, 1.38, 0, 1.32);

    // 庭院中段斜置木箱（可穿射对枪）
    crate(sign * 4.1, sign * 12.6, 1.50, 1.36, 0, 1.38, sign * 0.28);
    crate(-sign * 4.1, sign * 12.6, 1.42, 1.42, 0, 1.32);

    // 边路转角单/双层木箱（靠近侧道出口）
    crate(sign * 9.8, -sign * 8.4, 1.35, 1.35, 0, 1.28);
    crate(sign * 9.8, -sign * 9.75, 1.02, 1.02, 0, 0.96);

    // 家门口经典「②号点」石墩掩体（卡中门/边路过点狙）
    for (const side of [-1, 1]) {
      block(side * 5.0, sign * 17.3, 1.55, 1.10, 0, 1.32, sandMid, {material: 'stone'}, {carved: true});
    }

    // 外庭院方尖碑（视觉地标 + 侧翼硬掩体）
    obelisk(sign * 9.8, sign * 14.8, 1.18, 4.1);
    obelisk(-sign * 9.8, sign * 14.8, 1.18, 4.1);
  }

  // =========================================================================
  // 4. 家前左右狙击高台（x = ±7.8, z = ±12.2，4 级 0.20m 台阶升至 0.80m）
  // =========================================================================
  for (const sign of [-1, 1]) {
    for (const side of [-1, 1]) {
      const dx = side * 7.8;
      const dz = sign * 12.2;
      block(dx, dz, 2.2, 2.2, 0, 0.80, sandMid, {walkSurface: true, material: 'stone'}, {carved: true});
      // 4 级台阶从己方一侧平稳登上（每级 0.20m <= 0.22m）
      for (let s = 0; s < 4; s++) {
        block(dx, dz + sign * (1.35 + (3 - s) * 0.48), 1.9, 0.48, 0, (s + 1) * 0.20, s % 2 ? sandLight : sandMid, {walkSurface: true, material: 'stone'});
      }
      // 高台前沿半身石护墙（狙击手可露出上半身架边路与中场）
      block(dx, dz - sign * 0.98, 2.2, 0.24, 0.80, 1.48, sandDark, {material: 'stone'});
    }
  }

  // =========================================================================
  // 5. 两侧「Egypt 2.0 防堵家采光回廊暗道」(vents)
  // vents[0] 供 Team 1 (x = -12.9), vents[1] 供 Team 0 (x = +12.9)
  // =========================================================================
  for (const sign of [-1, 1]) {
    const x = sign * 12.9;
    const entryZ = sign * 17.6;
    const rise = 0.18;
    const run = 0.50;
    const steps = 6;
    const platH = steps * rise; // 1.08m
    const stairEnd = 17.6 - steps * run; // 14.6
    const exitAbs = 5.4;
    const exitZ = -sign * exitAbs;
    const galleryLen = stairEnd + exitAbs; // 20.0m
    const centerZ = sign * ((stairEnd - exitAbs) / 2);

    vents.push({entry: {x, z: sign * 18.2}, exit: {x, z: exitZ}});

    // 入口缓步台阶
    for (let i = 1; i <= steps; i++) {
      const z = sign * (17.6 - (i - 0.5) * run);
      block(x, z, 2.30, run, 0, i * rise, i % 2 ? sandLight : sandMid, {walkSurface: true, material: 'stone'});
    }

    // 抬高回廊通道地面
    block(x, centerZ, 2.40, galleryLen, 0, platH, sandMid, {walkSurface: true, material: 'stone'});

    // 回廊内侧立柱与低矮胸墙（留出埃及神殿采光柱廊，防止死闷感）
    const ceiling = platH + 2.35;
    const innerX = x - sign * 1.15;
    block(innerX, centerZ, 0.24, galleryLen, platH, platH + 1.05, sandLight, {material: 'stone'}, {carved: true});
    // 顶部檐口与采光石柱
    block(innerX, centerZ, 0.26, galleryLen, ceiling - 0.35, ceiling, sandDark, {material: 'stone'});
    for (let zOff = -exitAbs + 1.2; zOff <= stairEnd - 1.2; zOff += 3.2) {
      block(innerX, sign * zOff, 0.36, 0.42, platH + 1.05, ceiling - 0.35, sandMid, {material: 'stone'});
      // 廊顶采光横梁
      put(x, ceiling + 0.12, sign * zOff, 2.65, 0.26, 0.90, sandDark);
    }

    // 出口处阶梯木箱，方便上下与压制敌方侧翼
    const dropZ = exitZ - sign * 1.05;
    crate(x - sign * 0.42, dropZ, 1.08, 1.08, 0, 0.72);
  }

  // =========================================================================
  // 6. 南北封闭古埃及壁画出生石室（含顶盖、3 门洞正墙、法老石棺祭坛）
  // Team 0: z ∈ [20.2, 25.6] | Team 1: z ∈ [-25.6, -20.2]
  // =========================================================================
  for (const sign of [-1, 1]) {
    const wallZ = sign * 20.0;
    const chamberRoofY = 3.85;

    // 出生石室前墙：开 3 个宽敞门洞——左门 [-11.0, -7.8]、中门 [-2.2, 2.2]、右门 [7.8, 11.0]
    // 左外柱段 [-14.4, -11.0] 与右外柱段 [11.0, 14.4]
    for (const side of [-1, 1]) {
      block(side * 12.7, wallZ, 3.4, 0.85, 0, chamberRoofY, tombStone, {material: 'stone'}, {carved: true});
      // 中左墙 [-7.8, -2.2] 与中右墙 [2.2, 7.8]
      block(side * 5.0, wallZ, 5.6, 0.85, 0, chamberRoofY, tombStone, {material: 'stone'}, {carved: true});
    }
    // 三门上方门楣横梁（底高 3.05m，顶部与石室屋顶平齐）
    put(0, 3.45, wallZ, 28.8, 0.80, 0.96, sandDark, null, {carved: true});
    // 中门埃及飞翼太阳盘装饰 + 阵营徽章
    put(0, 3.42, wallZ - sign * 0.50, 3.8, 0.42, 0.10, sign > 0 ? '#2b5e7c' : '#8e3f2f', null, {noMap: true});
    put(0, 3.42, wallZ - sign * 0.56, 1.1, 0.48, 0.12, '#d4a64a', null, {noMap: true, metal: .65, rough: .35});

    // 出生石室顶盖（z ∈ [19.8, 26.0]），营造古埃及封闭墓室氛围
    block(0, sign * 22.9, 28.8, 6.2, chamberRoofY, chamberRoofY + 0.55, sandDark, {material: 'stone'});
    // 石室顶外沿女儿墙齿垛装饰
    for (let x = -12.6; x <= 12.6; x += 2.8) {
      put(x, chamberRoofY + 0.82, sign * 19.95, 1.4, 0.54, 0.42, sandMid);
    }

    // 石室内后墙中央「法老石棺祭坛」（z = ±24.85，不影响 8 个出生点）
    block(0, sign * 24.85, 2.6, 1.15, 0, 0.88, sandDark, {material: 'stone'}, {carved: true});
    put(0, 0.96, sign * 24.85, 2.3, 0.16, 0.95, '#d4a64a', null, {noMap: true, metal: .55, rough: .42});
    // 石室内阵营壁画与边框
    put(0, 2.35, sign * 25.55, 6.2, 1.45, 0.08, sign > 0 ? '#285570' : '#853c2e', null, {noMap: true});
    put(0, 2.35, sign * 25.50, 6.4, 0.14, 0.12, '#d4a64a', null, {noMap: true, metal: .62, rough: .38});

    // 外围神殿围墙
    block(0, sign * 26.0, 29.8, 0.8, 0, 5.4, sandLight, {material: 'stone'}, {carved: true});
    put(0, 5.58, sign * 26.0, 30.2, 0.36, 1.02, sandDark);
    block(sign * 14.75, 0, 0.7, 52.8, 0, 5.0, sandLight, {material: 'stone'}, {carved: true});
    put(sign * 14.75, 5.18, 0, 0.92, 0.36, 53.0, sandDark);
    for (let z = -22.5; z <= 22.5; z += 6.4) {
      put(sign * 14.98, 2.55, z, 0.65, 5.3, 1.15, sandDark);
    }
  }

  // =========================================================================
  // 7. 出生点 (每队 8 个，位于封闭石室内，无碰撞重叠) & AI 战术点
  // =========================================================================
  const team0Spawns = [];
  const team1Spawns = [];
  for (const zOff of [21.9, 23.6]) {
    for (const x of [-9.0, -3.5, 3.5, 9.0]) {
      team0Spawns.push({x, z: zOff, y: 0, yaw: 0});
      team1Spawns.push({x, z: -zOff, y: 0, yaw: Math.PI});
    }
  }
  const spawns = [team0Spawns, team1Spawns];

  const bounds = {minX: -14.4, maxX: 14.4, minZ: -25.6, maxZ: 25.6};
  const ai = {
    lanes: [-8.2, 0, 8.2],
    spawnZoneZ: [19.8, -19.8],
    snipers: [
      [
        {x: 0, z: 18.8, yaw: 0},          // 中门正中对狙位（①号点）
        {x: -7.8, z: 12.2, yaw: 0.14},    // 左翼高台架枪位
        {x: 7.8, z: 12.2, yaw: -0.14},    // 右翼高台架枪位
      ],
      [
        {x: 0, z: -18.8, yaw: Math.PI},
        {x: 7.8, z: -12.2, yaw: Math.PI + 0.14},
        {x: -7.8, z: -12.2, yaw: Math.PI - 0.14},
      ],
    ],
  };

  if (headless) {
    return {id: 'pyramid', bounds, spawns, solids, vents, ai};
  }

  // =========================================================================
  // 8. 3D 渲染环境：庭院铺地、荒漠沙丘、吉萨大金字塔群、狮身人面像轮廓、火盆与天空
  // =========================================================================
  const floorGeo = new T.PlaneGeometry(30, 54);
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
    if (Math.hypot(px, pz) > 36) {
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

  // 远景吉萨大金字塔群
  const bgPyrMat = new T.MeshStandardMaterial({color: '#caa56e', roughness: .95});
  materials.set('__bgPyr__', bgPyrMat);
  for (const [px, pz, rad, ht] of [[-86, -118, 62, 52], [86, -106, 48, 40], [98, 92, 52, 44], [-96, 98, 40, 34]]) {
    const pGeo = new T.ConeGeometry(rad, ht, 4);
    geometries.push(pGeo);
    const pMesh = new T.Mesh(pGeo, bgPyrMat);
    pMesh.position.set(px, ht * .5 - 0.5, pz);
    pMesh.rotation.y = Math.PI / 4;
    scene.add(pMesh);
  }

  // 远景标志性狮身人面像（Sphinx）剪影体块（位于东侧荒漠地平线）
  put(62, 4.5, -18, 12, 9, 26, '#c29c64');
  put(62, 12.2, -9, 7.5, 7.2, 8.2, '#c8a36b');
  put(62, 13.0, -9, 10.6, 5.5, 4.2, '#b9925c'); // Nemes headdress wings
  put(62, 2.2, -3, 3.2, 4.4, 12, '#c29c64');    // Front paws

  // 石室门口与庭院火盆（动态火焰）
  const brazierFlames = [];
  const flameGeo = new T.ConeGeometry(0.22, 0.62, 6);
  const flameMat = new T.MeshBasicMaterial({color: '#ff9b38'});
  geometries.push(flameGeo);
  materials.set('__flame__', flameMat);
  for (const sx of [-2.85, 2.85]) {
    for (const sz of [-18.9, 18.9]) {
      put(sx, 0.72, sz, 0.72, 1.44, 0.72, darkBronze, null, {noMap: true, metal: .45, rough: .55});
      put(sx, 1.50, sz, 0.88, 0.20, 0.88, '#b88c46', null, {noMap: true, metal: .5, rough: .45});
      const fl = new T.Mesh(flameGeo, flameMat);
      fl.position.set(sx, 1.88, sz);
      scene.add(fl);
      brazierFlames.push(fl);
    }
  }
  // 出生石室内火光补光
  for (const sz of [-23.0, 23.0]) {
    const torchLight = new T.PointLight(0xffb45c, 4.5, 16, 1.4);
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

  // 光照与天空穹顶
  const sky = new T.Color('#d4c7b0');
  scene.fog = new T.FogExp2(sky, 0.0048);
  scene.background = sky;

  const sun = new T.DirectionalLight(0xffe7bd, 2.3);
  sun.position.set(-40, 44, -44);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -36, right: 36, top: 36, bottom: -36, near: 10, far: 130});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);

  const hemi = new T.HemisphereLight(0xe8f3ff, 0xc9a576, 1.22);
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
    sun.intensity = late ? 1.80 : 2.30;
    sun.position.set(-40, late ? 18 : 44, -44);
    sun.shadow.needsUpdate = true;
    hemi.color.set(late ? '#b09cc4' : '#e8f3ff');
    hemi.groundColor.set(late ? '#805a46' : '#c9a576');
    hemi.intensity = late ? 1.05 : 1.22;
    sky.set(late ? '#c78462' : '#d4c7b0');
    scene.fog.color.copy(sky);
    scene.fog.density = late ? 0.0072 : 0.0048;
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
    birds.forEach(({body, wings}, i) => {
      if (!body.visible) return;
      const t = timeSeconds * 0.075 + i * 1.3;
      body.position.set(Math.cos(t) * (17 + i * 1.4), 14 + i * 0.65 + Math.sin(t * 2) * 0.6, Math.sin(t) * (24 + i * 0.8));
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
    menuCamera: {pos: [14.0, 10.5, 19.2], lookAt: [0, 1.8, -2.5]},
    fx,
    setTime,
    setQuality,
    update,
    dispose,
  };
}
