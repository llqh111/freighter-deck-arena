export const matchRules = {
  duel: {size: 1, goals: [10], goal: 10},
  tdm: {size: 6, goals: [30, 50, 100], goal: 50},
  // 狙击对决：规则与团队竞技一致（人数 / 目标击杀 / 难度），但全场只发放 AWM。
  // 目标击杀下调一档，因为 AWM 拉栓 1.43s，节奏天然比步枪慢。
  sniper: {size: 6, goals: [20, 30, 50], goal: 30},
  knife: {size: 3, goals: [15, 25, 30], goal: 15}
};

export function matchDuration(mode, size) {
  return mode === 'duel' || mode === 'knife' || size === 3 ? 300 : 600;
}

// 狙击对决沿用团队竞技的人数档位与时长规则。
export const isSquadMode = mode => mode === 'tdm' || mode === 'sniper';
