import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import * as T from '../three.module.js';
import { createMatch } from '../match.js';

const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.74;
const STEP_DT = 1 / 60;
const MAX_SIM_SECONDS = 300;
const MAX_TICKS = MAX_SIM_SECONDS * 60;

const MAP_REGISTRY = [
  {
    name: 'ship',
    modulePath: new URL('../world.js', import.meta.url),
    exportName: 'buildWorld',
  },
  {
    name: 'pyramid',
    modulePath: new URL('../pyramid-world.js', import.meta.url),
    exportName: 'buildPyramidWorld',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isFiniteNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function inBounds(x, z, bounds, margin = 0) {
  return (
    x >= bounds.minX + margin &&
    x <= bounds.maxX - margin &&
    z >= bounds.minZ + margin &&
    z <= bounds.maxZ - margin
  );
}

function footprint(x, z, s, r = PLAYER_RADIUS) {
  const yaw = s.yaw || 0;
  const c = Math.cos(yaw);
  const n = Math.sin(yaw);
  const dx = x - s.x;
  const dz = z - s.z;
  const ex = Math.max(0, Math.abs(dx * c - dz * n) - s.w / 2);
  const ez = Math.max(0, Math.abs(dx * n + dz * c) - s.d / 2);
  return ex * ex + ez * ez < r * r;
}

function overlapsSolid(x, z, y, s, r = PLAYER_RADIUS, includeWalkSurface = true) {
  if (!includeWalkSurface && s.walkSurface) return false;
  return s.bottom < y + PLAYER_HEIGHT && s.top > y + 0.001 && footprint(x, z, s, r);
}

function validateMap(name, world) {
  assert(world && typeof world === 'object', `[${name}] world object is missing`);

  // 1. bounds
  const { bounds } = world;
  assert(bounds && typeof bounds === 'object', `[${name}] bounds is missing`);
  for (const k of ['minX', 'maxX', 'minZ', 'maxZ']) {
    assert(isFiniteNum(bounds[k]), `[${name}] bounds.${k} must be a finite number, got ${bounds[k]}`);
  }
  assert(bounds.minX < bounds.maxX, `[${name}] bounds.minX (${bounds.minX}) must be < bounds.maxX (${bounds.maxX})`);
  assert(bounds.minZ < bounds.maxZ, `[${name}] bounds.minZ (${bounds.minZ}) must be < bounds.maxZ (${bounds.maxZ})`);

  // 2. solids
  assert(Array.isArray(world.solids), `[${name}] solids must be an array`);
  world.solids.forEach((s, i) => {
    for (const k of ['x', 'z', 'w', 'd', 'bottom', 'top']) {
      assert(isFiniteNum(s[k]), `[${name}] solids[${i}].${k} must be finite`);
    }
    assert(s.w > 0 && s.d > 0, `[${name}] solids[${i}] w/d must be > 0`);
    assert(s.bottom < s.top, `[${name}] solids[${i}] bottom (${s.bottom}) must be < top (${s.top})`);
  });

  // 3. spawns
  assert(Array.isArray(world.spawns) && world.spawns.length === 2, `[${name}] spawns must be a 2-element array [team0, team1]`);
  for (let team = 0; team < 2; team++) {
    const teamSpawns = world.spawns[team];
    assert(Array.isArray(teamSpawns), `[${name}] spawns[${team}] must be an array`);
    assert(teamSpawns.length >= 6, `[${name}] spawns[${team}] must have >= 6 points, got ${teamSpawns.length}`);
    teamSpawns.forEach((sp, i) => {
      assert(isFiniteNum(sp.x) && isFiniteNum(sp.z), `[${name}] spawns[${team}][${i}] x/z must be finite`);
      const y = sp.y ?? 0;
      assert(isFiniteNum(y), `[${name}] spawns[${team}][${i}].y must be finite`);
      assert(
        inBounds(sp.x, sp.z, bounds, PLAYER_RADIUS),
        `[${name}] spawns[${team}][${i}] (${sp.x}, ${sp.z}) is outside bounds (with radius ${PLAYER_RADIUS})`
      );
      const hit = world.solids.find((s) => overlapsSolid(sp.x, sp.z, y, s, PLAYER_RADIUS, true));
      assert(
        !hit,
        `[${name}] spawns[${team}][${i}] (${sp.x}, ${sp.z}, y=${y}) collides with solid at (${hit?.x}, ${hit?.z}, bottom=${hit?.bottom}, top=${hit?.top})`
      );
    });
  }

  // 4. vents
  assert(Array.isArray(world.vents), `[${name}] vents must be an array`);
  assert(world.vents.length >= 2, `[${name}] vents must have >= 2 entries, got ${world.vents.length}`);
  world.vents.forEach((v, i) => {
    for (const end of ['entry', 'exit']) {
      const pt = v?.[end];
      assert(pt && isFiniteNum(pt.x) && isFiniteNum(pt.z), `[${name}] vents[${i}].${end} must have finite x/z`);
      assert(inBounds(pt.x, pt.z, bounds), `[${name}] vents[${i}].${end} (${pt.x}, ${pt.z}) is outside bounds`);
      const hit = world.solids.find((s) => overlapsSolid(pt.x, pt.z, 0, s, 0.01, false));
      assert(
        !hit,
        `[${name}] vents[${i}].${end} (${pt.x}, ${pt.z}) is embedded inside solid wall at (${hit?.x}, ${hit?.z}, bottom=${hit?.bottom}, top=${hit?.top})`
      );
    }
  });

  // 5. ai
  const { ai } = world;
  assert(ai && typeof ai === 'object', `[${name}] ai config is missing`);
  assert(Array.isArray(ai.lanes) && ai.lanes.length === 3, `[${name}] ai.lanes must be an array of 3 numbers`);
  ai.lanes.forEach((laneX, i) => {
    assert(isFiniteNum(laneX), `[${name}] ai.lanes[${i}] must be finite`);
    assert(
      laneX >= bounds.minX && laneX <= bounds.maxX,
      `[${name}] ai.lanes[${i}] (${laneX}) is outside bounds.minX..maxX [${bounds.minX}, ${bounds.maxX}]`
    );
  });

  assert(Array.isArray(ai.snipers) && ai.snipers.length === 2, `[${name}] ai.snipers must be a 2-element array [team0, team1]`);
  for (let team = 0; team < 2; team++) {
    const pts = ai.snipers[team];
    assert(Array.isArray(pts) && pts.length >= 2, `[${name}] ai.snipers[${team}] must have >= 2 points`);
    pts.forEach((pt, i) => {
      assert(pt && isFiniteNum(pt.x) && isFiniteNum(pt.z), `[${name}] ai.snipers[${team}][${i}] must have finite x/z`);
      assert(inBounds(pt.x, pt.z, bounds), `[${name}] ai.snipers[${team}][${i}] (${pt.x}, ${pt.z}) is outside bounds`);
    });
  }

  if (ai.spawnZoneZ !== undefined) {
    assert(
      Array.isArray(ai.spawnZoneZ) && ai.spawnZoneZ.length === 2 && ai.spawnZoneZ.every(isFiniteNum),
      `[${name}] ai.spawnZoneZ must be a 2-element finite number array`
    );
    for (let i = 0; i < 2; i++) {
      assert(
        ai.spawnZoneZ[i] >= bounds.minZ && ai.spawnZoneZ[i] <= bounds.maxZ,
        `[${name}] ai.spawnZoneZ[${i}] (${ai.spawnZoneZ[i]}) is outside bounds.minZ..maxZ`
      );
    }
  }
}

function createStubs() {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(78, 1, 0.05, 120);
  const fx = {
    reset() {},
    impact() {},
    headshot() {},
    wound() {},
    muzzle() {},
    eject() {},
    explode() {},
  };
  const view = {
    update() {},
    setTeam() {},
    equip() {},
    reload() {},
    shoot() {},
    meleeContact() {},
    flourish() {},
    fidget() {},
    inspect() {},
  };
  return { scene, camera, fx, view };
}

function checkFiniteActors(name, match, tick) {
  const allUnits = [match.state.player, ...match.state.actors];
  for (const u of allUnits) {
    for (const k of ['x', 'y', 'z', 'yaw']) {
      if (!Number.isFinite(u[k])) {
        throw new Error(`[${name}] Non-finite ${k}=${u[k]} for unit ${u.name || u.id} at tick ${tick}`);
      }
    }
  }
}

function simulate6v6(name, world) {
  const { scene, camera, fx, view } = createStubs();
  const match = createMatch({
    scene,
    camera,
    world: { ...world, fx },
    view,
    emit: () => {},
  });

  match.start({ mode: 'tdm', size: 6, goal: 30, diff: 'normal', team: 0 });
  assert(match.state.phase === 'playing', `[${name}] expected phase='playing' after start(), got '${match.state.phase}'`);
  assert(match.state.actors.length === 11, `[${name}] expected 11 bots in 6v6, got ${match.state.actors.length}`);

  let ticks = 0;
  const startMs = performance.now();
  while (match.state.phase !== 'ended' && ticks < MAX_TICKS) {
    match.update(STEP_DT);
    ticks++;
    if (ticks % 60 === 0) checkFiniteActors(name, match, ticks);
  }
  checkFiniteActors(name, match, ticks);
  const elapsedMs = performance.now() - startMs;

  assert(
    match.state.phase === 'ended',
    `[${name}] match did not end within ${MAX_SIM_SECONDS}s (${MAX_TICKS} ticks); phase='${match.state.phase}', score=${JSON.stringify(match.state.score)}`
  );
  const [s0, s1] = match.state.score;
  assert(s0 > 0 && s1 > 0, `[${name}] expected both teams to have > 0 kills, got score=[${s0}, ${s1}]`);

  return {
    ticks,
    simSeconds: +(ticks * STEP_DT).toFixed(2),
    elapsedMs: Math.round(elapsedMs),
    score: [s0, s1],
  };
}

function parseMapArg(argv) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--map=')) return arg.slice(6);
    if (arg === '--map' && i + 1 < argv.length) return argv[i + 1];
  }
  return 'all';
}

async function main() {
  const target = parseMapArg(process.argv.slice(2));
  const selected = target === 'all'
    ? MAP_REGISTRY
    : MAP_REGISTRY.filter((m) => m.name === target);

  if (selected.length === 0) {
    console.error(`Unknown --map=${target}. Valid values: all, ${MAP_REGISTRY.map((m) => m.name).join(', ')}`);
    process.exit(1);
  }

  let passed = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of selected) {
    if (!existsSync(entry.modulePath)) {
      console.log(`[SKIP] ${entry.name}: ${basename(entry.modulePath.pathname)} not found (pending integration)`);
      skipped++;
      continue;
    }

    try {
      const mod = await import(entry.modulePath.href);
      const buildFn = mod[entry.exportName];
      if (typeof buildFn !== 'function') {
        console.log(`[SKIP] ${entry.name}: export '${entry.exportName}' not found`);
        skipped++;
        continue;
      }

      const world = buildFn();
      validateMap(entry.name, world);
      console.log(`[PASS] ${entry.name} interface validation (solids=${world.solids.length}, spawns=[${world.spawns[0].length},${world.spawns[1].length}], vents=${world.vents.length})`);

      const sim = simulate6v6(entry.name, world);
      console.log(`[PASS] ${entry.name} 6v6 headless simulation (score=${sim.score[0]}-${sim.score[1]}, simTime=${sim.simSeconds}s, ticks=${sim.ticks}, wallTime=${sim.elapsedMs}ms)`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${entry.name}:`, err);
      failed++;
    }
  }

  console.log(`\nSummary: ${passed} passed, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main();
