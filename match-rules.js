export const matchRules = {
  duel: {size: 1, goals: [10], goal: 10},
  tdm: {size: 6, goals: [30, 50, 100], goal: 50},
  knife: {size: 3, goals: [15, 25, 30], goal: 15}
};

export function matchDuration(mode, size) {
  return mode === 'duel' || mode === 'knife' || size === 3 ? 300 : 600;
}
