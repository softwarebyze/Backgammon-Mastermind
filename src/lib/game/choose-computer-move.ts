/**
 * Computer move selection: GNU Backgammon (web) with heuristic fallback.
 */
import type { GameState, Move } from './types';

import { getAIMove } from './ai';
import { getGnuMove, isGnuEngineReady, preloadGnuEngine } from './gnu-engine';

export type ComputerMoveSource = 'gnu' | 'heuristic';

export type ComputerMoveResult = {
  move: Move | null;
  source: ComputerMoveSource;
};

/**
 * Choose the next single-die move for the side to play.
 * On web, prefers GNU when the WASM engine is ready; otherwise heuristic search.
 */
export async function chooseComputerMove(state: GameState): Promise<ComputerMoveResult> {
  if (state.phase !== 'moving')
    return { move: null, source: 'heuristic' };

  if (!isGnuEngineReady()) {
    // Kick off load; first turns may still use heuristic until ready.
    void preloadGnuEngine();
  }

  try {
    const gnuMove = await getGnuMove(state);
    if (gnuMove)
      return { move: gnuMove, source: 'gnu' };
  }
  catch (error) {
    console.warn('[ai] GNU move failed, using heuristic', error);
  }

  return { move: getAIMove(state), source: 'heuristic' };
}

export { getGnuEngineStatus, isGnuEngineReady, preloadGnuEngine } from './gnu-engine';
