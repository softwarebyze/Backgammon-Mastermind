/** Rotating beginner tips — Duolingo-style micro-lessons while waiting. */
export const GAME_TIPS = [
  'Even rolls often let you stay on the same color point — look for safe stacks.',
  'If your dice are n apart, look for stacks n spaces apart — you may build a new anchor.',
  'Your checkers move in a horseshoe: opponent\'s home → outer boards → your home (points 1–6).',
  'You must enter from the bar before moving any other checker.',
  'Hitting a lone blot sends it to the bar — they must re-enter before moving.',
  'When bearing off, a die larger than your highest point uses that highest point.',
  'Doubles give you four moves with that number — use them wisely!',
  'The 2-5-3-5 setup: 2 on the 24-point, 5 on 13, 3 on 8, 5 on 6 (for White).',
  'Anchors in your opponent\'s home board slow them down — worth the risk sometimes.',
  'If you can\'t use both dice, play the larger die when possible.',
  'Woolsey\'s Law: if unsure whether they take or drop, consider doubling.',
  'Pip count: lower total pips means you\'re ahead in a race.',
] as const;

export function pickTip(seed: number): string {
  const index = Math.abs(seed) % GAME_TIPS.length;
  return GAME_TIPS[index]!;
}
