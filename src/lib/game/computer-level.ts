/**
 * How strong the computer plays. Every level asks the engine; the weaker ones
 * look less far ahead and misjudge each option by a random amount, so they
 * make the kind of mistakes people make: close choices go wrong often, clear
 * ones rarely.
 */
export type ComputerLevel = 'easy' | 'medium' | 'hard' | 'expert';

export const COMPUTER_LEVELS: readonly ComputerLevel[] = ['easy', 'medium', 'hard', 'expert'];

export const DEFAULT_COMPUTER_LEVEL: ComputerLevel = 'medium';

type LevelSettings = {
  /** Engine search depth. */
  ply: 1 | 2;
  /** Standard deviation of the error added to each option's equity. */
  noise: number;
};

export const COMPUTER_LEVEL_SETTINGS: Record<ComputerLevel, LevelSettings> = {
  easy: { ply: 1, noise: 0.35 },
  medium: { ply: 1, noise: 0.12 },
  hard: { ply: 2, noise: 0.03 },
  expert: { ply: 2, noise: 0 },
};

export function isComputerLevel(value: unknown): value is ComputerLevel {
  return typeof value === 'string' && (COMPUTER_LEVELS as readonly string[]).includes(value);
}

/** A normally distributed sample (mean 0, sd 1) from a uniform source. */
function gaussian(random: () => number): number {
  const u = Math.max(random(), Number.EPSILON);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * The option this level would choose: each equity plus random error, highest
 * wins. With no noise it is always the best option. Expects at least one option.
 */
export function chooseAtLevel<T>(
  options: readonly { option: T; equity: number }[],
  level: ComputerLevel,
  random: () => number = Math.random,
): T {
  const { noise } = COMPUTER_LEVEL_SETTINGS[level];
  let best = options[0];
  let bestScore = -Infinity;
  for (const entry of options) {
    const score = entry.equity + (noise > 0 ? noise * gaussian(random) : 0);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best.option;
}
