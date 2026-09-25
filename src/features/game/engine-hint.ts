import type { GameEngine } from './engine';

import type { GameState, Move } from '@/lib/game/types';
import { fallbackEngine, primaryEngine } from './engine';
import { formatHintNotation } from './guidance-copy';

export type EngineHint = {
  moves: Move[];
  /** e.g. "13/11 · 8/5" */
  notation: string;
  ms: number;
  /**
   * Id of the engine that answered. Lets the UI label a real answer
   * differently from a fallback without naming any engine.
   */
  engineId: string;
};

/**
 * Ask the engines for the best turn from the current position, in order:
 * primary first, then the fallback (built-in heuristic AI when the real
 * engine isn't available — Expo Go, unlinked native module, WASM not yet
 * loaded). Throws when no engine can suggest a move.
 *
 * Pass explicit engines in tests; production uses the swap point in
 * `./engine`.
 */
export async function getEngineHint(
  state: GameState,
  engines: readonly GameEngine[] = [primaryEngine, fallbackEngine],
): Promise<EngineHint> {
  const t0 = Date.now();
  let lastError: unknown = null;
  for (const engine of engines) {
    try {
      const plan = await engine.planTurn(state);
      if (plan.moves.length > 0) {
        return {
          moves: plan.moves,
          notation: formatHintNotation(plan.moves),
          ms: Date.now() - t0,
          engineId: engine.id,
        };
      }
      lastError = new Error(`${engine.id} returned no moves`);
    }
    catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('no engine could suggest a move');
}
