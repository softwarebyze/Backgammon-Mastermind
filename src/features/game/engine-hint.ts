import type { GameEngine } from './engine';

import type { GameState, Move } from '@/lib/game/types';
import { primaryEngine } from './engine';
import { formatHintNotation } from './guidance-copy';

export type EngineHint = {
  moves: Move[];
  /** e.g. "13/11 · 8/5" */
  notation: string;
  ms: number;
  /** Id of the engine that answered. Never shown to the player. */
  engineId: string;
};

/**
 * Ask the primary engine for the best turn from the current position.
 * Throws when it cannot answer — callers must not substitute another
 * engine. A missing native module, a failed web load, or an over-budget
 * analysis means no hint.
 *
 * Pass an engine in tests; production uses the swap point in `./engine`.
 */
export async function getEngineHint(
  state: GameState,
  engine: GameEngine = primaryEngine,
): Promise<EngineHint> {
  const t0 = Date.now();
  const plan = await engine.planTurn(state);
  if (plan.moves.length === 0) {
    throw new Error(`${engine.id} returned no moves`);
  }
  return {
    moves: plan.moves,
    notation: formatHintNotation(plan.moves),
    ms: Date.now() - t0,
    engineId: engine.id,
  };
}
