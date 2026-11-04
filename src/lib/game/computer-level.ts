/**
 * How strong the computer plays. Every level asks the engine for its ranked
 * options; the weaker ones pick among them at random, weighted toward the
 * better ones, so they make the kind of mistakes people make: close choices
 * go wrong often, clear ones rarely.
 */
export type ComputerLevel = 'easy' | 'medium' | 'hard' | 'expert';

export const COMPUTER_LEVELS: readonly ComputerLevel[] = ['easy', 'medium', 'hard', 'expert'];

export const DEFAULT_COMPUTER_LEVEL: ComputerLevel = 'medium';

type LevelSettings = {
  /** Engine search depth. 1-ply is the depth that fits the web engine's time budget. */
  ply: 1 | 2;
  /**
   * Softmax temperature in equity. An option that loses `x` against the best
   * is weighted exp(-x / temperature); 0 always takes the best.
   */
  temperature: number;
};

/**
 * Measured over 1,000 games per pairing (PR #213): each level beats the one
 * below it, Easy wins about 9% against Medium, Medium about 33% against Hard
 * and Hard about 41% against Expert.
 */
export const COMPUTER_LEVEL_SETTINGS: Record<ComputerLevel, LevelSettings> = {
  easy: { ply: 1, temperature: 0.2 },
  medium: { ply: 1, temperature: 0.06 },
  hard: { ply: 1, temperature: 0.025 },
  expert: { ply: 1, temperature: 0 },
};

export function isComputerLevel(value: unknown): value is ComputerLevel {
  return typeof value === 'string' && (COMPUTER_LEVELS as readonly string[]).includes(value);
}

/**
 * The option this level would choose. Near-equal options mix freely; a big
 * mistake's weight decays exponentially with its equity loss, so it stays
 * rare. At temperature 0 it is always the best option. Expects at least one option.
 */
export function chooseAtLevel<T>(
  options: readonly { option: T; equity: number }[],
  level: ComputerLevel,
  random: () => number = Math.random,
): T {
  const { temperature } = COMPUTER_LEVEL_SETTINGS[level];
  const best = options.reduce((top, entry) => (entry.equity > top.equity ? entry : top), options[0]);
  if (!(temperature > 0) || options.length === 1)
    return best.option;
  const weights = options.map(entry => Math.exp(-(best.equity - entry.equity) / temperature));
  let r = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < options.length; i++) {
    r -= weights[i];
    if (r < 0)
      return options[i].option;
  }
  return best.option;
}
