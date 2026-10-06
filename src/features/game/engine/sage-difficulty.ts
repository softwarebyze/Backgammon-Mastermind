/**
 * Computer opponent strength. 'classic' is the original heuristic AI
 * (`getAIMove`); the rest are bgsage at a fixed search depth, picking among
 * the engine's ranked candidates with softmax noise on equity loss.
 */
export type ComputerLevel = 'classic' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type SageLevel = Exclude<ComputerLevel, 'classic'>;

export type SageLevelConfig = {
  /** bgsage search depth (1 = static net eval of each candidate, 2 = engine-side lookahead on every candidate). */
  ply: 1 | 2;
  /**
   * Softmax temperature in cubeless equity. A candidate that loses `x`
   * equity vs the best is weighted `exp(-x / temperature)`; 0 always plays
   * the engine's top choice.
   */
  temperature: number;
};

export const SAGE_LEVELS: Record<SageLevel, SageLevelConfig> = {
  beginner: { ply: 1, temperature: 0.2 },
  intermediate: { ply: 1, temperature: 0.06 },
  advanced: { ply: 1, temperature: 0.025 },
  expert: { ply: 1, temperature: 0 },
};

export const COMPUTER_LEVELS: ComputerLevel[] = ['classic', 'beginner', 'intermediate', 'advanced', 'expert'];

export function isSageLevel(level: ComputerLevel): level is SageLevel {
  return level !== 'classic';
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
