// 模式体检：无头跑一遍各对局模式，断言装备锁定、槽位映射与规则数值。
// 用法：node tools/verify-modes.mjs
import * as T from '../three.module.js';
import {buildWorld} from '../world.js';
import {createMatch} from '../match.js';
import {meleeSlotFor} from '../arsenal.js?v=31';

// buildWorld() 不传 scene 走 headless 分支：只构碰撞体不建网格，Node 下可用。
// headless 世界没有 fx，按 duel-server 的做法补一个空特效桩。
const scene = new T.Scene();
const fx = new Proxy({reset() {}}, {get: (target, key) => (key in target ? target[key] : () => {})});
const world = {...buildWorld(), fx};
const camera = new T.PerspectiveCamera(78, 1, .05, 400);
const view = new Proxy({}, {get: () => () => {}});
const make = emit => createMatch({scene, camera, world, view, emit});

const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

// === 狙击对决：真人与电脑同枪，副武器与手雷保留 ===
const log = [];
const sniper = make((type, data) => log.push([type, data]));
sniper.start({mode: 'sniper', team: 0, size: 6, goal: 30, diff: 'normal', primary: 'ak47', melee: 'karambit'});
const s = sniper.state;
const inv = s.inventory;

check(s.mode === 'sniper', '狙击对决 state.mode 应为 sniper，实际 ' + s.mode);
check(s.target === 30, '狙击对决目标击杀应为 30，实际 ' + s.target);
check(s.remaining === 600, '6v6 狙击对决时长应为 600s，实际 ' + s.remaining);
check(inv.length === 4, '玩家应有 4 个槽位，实际 ' + inv.length);
check(inv[0].id === 'awm', '玩家主武器应为 awm，实际 ' + inv[0].id);
check(inv[1].id === 'deagle', '副武器应为 deagle，实际 ' + inv[1].id);
check(inv[2].id === 'karambit', '近战应为 karambit，实际 ' + inv[2].id);
check(inv[3].id === 'he', '手雷槽应为 he，实际 ' + inv[3].id);
check(sniper.input('primary', 'ak47') === null, '狙击对决下换 AK 应被拒绝');

const actors = s.actors || [];
check(actors.length === 11, '6v6 应有 11 个电脑，实际 ' + actors.length);
for (const b of actors) {
  if (b.inventory[0].id !== 'awm') fail.push('电脑 ' + b.name + ' 主武器不是 awm：' + b.inventory[0].id);
  if (b.role !== 'sniper') fail.push('电脑 ' + b.name + ' 角色不是 sniper：' + b.role);
}

// 跑 20 秒对局（1200 tick）：移动 + 开火 + 开镜 + 切枪，检查运行期不炸
let ticks = 0;
try {
  for (let i = 0; i < 1200; i++) {
    sniper.input('forward', i % 60 < 30);
    sniper.input('fire', i % 40 === 0);
    sniper.input('aim', i % 97 === 0);
    sniper.input('slot', i % 300 === 0 ? 1 : 0);
    sniper.look(Math.sin(i * .05) * 3, Math.cos(i * .03) * 1.2);
    sniper.update(1 / 60);
    ticks++;
    if (s.phase !== 'playing') break;
  }
} catch (e) {
  fail.push('对局循环抛异常：' + e.message);
}

// === 团队竞技回归：主武器仍由玩家决定，电脑保持混编 ===
const tdm = make(() => {});
tdm.start({mode: 'tdm', team: 0, size: 6, goal: 50, diff: 'normal', primary: 'ak47', melee: 'nepal'});
check(tdm.state.inventory[0].id === 'ak47', 'TDM 主武器应保持玩家所选的 ak47');
check(tdm.state.inventory.length === 4, 'TDM 应为 4 槽');
check((tdm.state.actors || []).some(b => b.primary !== 'awm'), 'TDM 电脑应保持混编武器');

// === 刀战回归：单槽纯近战 ===
const knife = make(() => {});
knife.start({mode: 'knife', team: 0, goal: 15, diff: 'normal', primary: 'ak47', melee: 'malay'});
check(knife.state.inventory.length === 1 && knife.state.inventory[0].id === 'malay', '刀战应为单槽纯近战');
check(meleeSlotFor('sniper') === 2 && meleeSlotFor('tdm') === 2 && meleeSlotFor('knife') === 0, 'meleeSlotFor 映射不对');

console.log('狙击对决：' + ticks + ' tick · 阶段 ' + s.phase + ' · 比分 ' + s.score.join(':') + ' · 弹药 ' + s.ammo + '/' + s.reserve + ' · ' + s.weapon);

if (fail.length) {
  console.log('\n失败 ' + fail.length + ' 项：');
  for (const f of fail) console.log(' - ' + f);
  process.exit(1);
}
console.log('全部检查通过');
