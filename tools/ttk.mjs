// 数值体检脚本：把 arsenal.js 的真值直接换算成「击杀枪数 / TTK / 距离衰减」。
// 用法：node tools/ttk.mjs
// 任何数值改动后跑一次，确认表格和设计意图一致，避免"改了一个数顺手废掉一把枪"。
import {arsenal,falloff,primaries,melees} from '../arsenal.js';

const HP = 100, ARMOR = 100;

// 与 match.js 的 rangeScale() 保持同一实现
const rangeScale = (id, dist) => {
  const f = falloff[id];
  if (!f || dist <= f.from) return 1;
  return Math.max(f.floor, 1 - (1 - f.floor) * Math.min(1, (dist - f.from) / (f.to - f.from)));
};

// 与 match.js 的 damage() 保持同一护甲模型：hp -= amount × 武器穿甲系数
const simulate = (id, dist, head = false) => {
  const w = arsenal[id];
  let hp = HP, armor = ARMOR, shots = 0;
  while (hp > 0 && shots < 60) {
    const amount = w.damage * (head ? w.head : 1) * rangeScale(id, dist);
    const absorb = Math.min(armor, amount * (1 - w.armor));
    armor -= absorb;
    hp = Math.max(0, hp - amount + absorb);
    shots++;
  }
  return {shots, ttk: +((shots - 1) * w.interval).toFixed(3)};
};

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log('\n== 枪械：满血满甲，躯干命中 ==');
console.log(pad('武器', 8) + num('5m', 12) + num('20m', 12) + num('30m', 12) + num('爆头', 12) + num('拉栓/间隔', 12));
for (const id of [...primaries, 'deagle']) {
  const w = arsenal[id];
  const cell = d => { const r = simulate(id, d); return r.shots + '枪/' + r.ttk.toFixed(2) + 's'; };
  const hs = simulate(id, 5, true);
  console.log(pad(id, 8) + num(cell(5), 12) + num(cell(20), 12) + num(cell(30), 12) + num(hs.shots + '枪', 12) + num(w.interval.toFixed(2) + 's', 12));
}

console.log('\n== 枪械：爆头是否满甲一枪 ==');
for (const id of [...primaries, 'deagle']) {
  const w = arsenal[id];
  const armored = w.damage * w.head * w.armor;
  const bare = w.damage * w.head;
  const tag = armored >= HP ? '满甲一枪' : armored + ' 满甲不杀';
  console.log(pad(id, 8) + num(armored.toFixed(1), 10) + ' / 无甲 ' + bare.toFixed(1) + '  → ' + tag);
}

console.log('\n== 近战：正面满甲 ==');
console.log(pad('武器', 10) + num('轻击', 16) + num('重击', 22) + num('轻CD', 8) + num('重CD', 8) + num('轻/重距离', 12) + num('拔刀', 8));
for (const id of melees) {
  const w = arsenal[id];
  const light = w.lightDmg * w.armor, heavy = w.heavyDmg * w.armor;
  const lightKill = Math.ceil(HP / light);
  const heavyTag = heavy >= HP ? '1刀死' : '不杀(剩' + (HP - heavy).toFixed(1) + ')';
  console.log(pad(id, 10) + num(light.toFixed(1) + '→' + lightKill + '刀', 16) + num(heavy.toFixed(1) + '→' + heavyTag, 22) +
    num(w.lightCd, 8) + num(w.heavyCd, 8) + num(w.reach + '/' + w.heavyReach, 12) + num(w.drawCd, 8));
}

console.log('\n== 距离衰减是否真的改变击杀枪数 ==');
for (const [id, f] of Object.entries(falloff)) {
  const inR = simulate(id, f.from).shots, outR = simulate(id, f.to + 4).shots;
  console.log(pad(id, 8) + `衰减区间 ${f.from}-${f.to}m  floor ${f.floor}  →  ${f.from}m: ${inR}枪  ${f.to + 4}m: ${outR}枪  ` +
    (inR === outR ? '【衰减无效，只是复杂度】' : '【有效】'));
}

console.log('');
