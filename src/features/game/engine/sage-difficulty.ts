/**
 * Sage opponent strength. The three Sage levels use bgsage 1-ply — the only search
 * depth that fits the web engine's 1000 ms budget — but they differ in how
 * strictly they follow the engine's ranked moves. Lower levels mix in
 * ranked plays with softmax noise on equity loss; Hard always takes the
 * engine's top choice.
 */
export type ComputerLevel = 'classic' | 'easy' | 'medium' | 'hard';

export type SageLevelConfig = {
  /** bgsage search depth (1 = static net evaluation of each candidate). */
  ply: 1 | 2;
  /**
   * Softmax temperature in cubeless equity. A candidate that loses `x`
   * equity vs the best is weighted `exp(-x / temperature)`; 0 always plays
   * the engine's top choice.
   */
  temperature: number;
};

export const SAGE_LEVELS: Record<Exclude<ComputerLevel, 'classic'>, SageLevelConfig> = {
  easy: { ply: 1, temperature: 0.2 },
  medium: { ply: 1, temperature: 0.06 },
  hard: { ply: 1, temperature: 0 },
};

export const COMPUTER_LEVELS: readonly ComputerLevel[] = ['classic', 'easy', 'medium', 'hard'];
export const DEFAULT_COMPUTER_LEVEL: ComputerLevel = 'classic';

export function isComputerLevel(level: unknown): level is ComputerLevel {
  return typeof level === 'string' && (COMPUTER_LEVELS as readonly string[]).includes(level);
}

/**
 * Index of the candidate to play. `candidates` must be best-first (as
 * planSageTurnFull returns them). Large blunders stay rare because their
 * weight decays exponentially with equity loss; near-equal plays mix freely.
 */
export function pickCandidateIndex(
  candidates: readonly { equity: number }[],
  temperature: number,
  rng: () => number = Math.random,
): number {
  if (candidates.length <= 1 || !(temperature > 0))
    return 0;
  const best = candidates[0].equity;
  const weights = candidates.map(c => Math.exp(-(best - c.equity) / temperature));
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0)
      return i;
  }
  return 0;
}
