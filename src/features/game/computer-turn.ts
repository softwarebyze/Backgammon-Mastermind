import type { SageLevel } from './engine/sage-difficulty';
import type { GameState, Move } from '@/lib/game/types';

import { planSageTurnFull, sageBoardToMoves } from 'expo-bgsage';
import { applyMove } from '@/lib/game/moves';
import { pickCandidateIndex, SAGE_LEVELS } from './engine/sage-difficulty';
import { nextPlannedMove } from './planned-move';

/**
 * Full turn for the computer at a bgsage level. Each move carries its die
 * value so it still resolves after earlier moves shrink `remainingDice`.
 * Throws when the engine is unavailable; the caller falls back to the
 * heuristic AI.
 */
export async function planSageComputerTurn(
  state: GameState,
  level: SageLevel,
  rng: () => number = Math.random,
): Promise<Move[]> {
  const { ply, temperature } = SAGE_LEVELS[level];
  const plan = await planSageTurnFull(state, ply);
  const pick = pickCandidateIndex(plan.candidates, temperature, rng);
  const order = [pick, ...plan.candidates.map((_, i) => i).filter(i => i !== pick)];
  for (const index of order) {
    const moves = playableMoves(state, plan.candidates[index].board);
    if (moves)
      return moves;
  }
  throw new Error('no sage candidate is legal here');
}

/**
 * Sage occasionally ranks a bear-off that spends fewer dice than the app's
 * rules allow. Skip it and take the next candidate instead of failing the turn.
 */
function playableMoves(state: GameState, board: number[]): Move[] | null {
  let decoded;
  try {
    decoded = sageBoardToMoves(state, board);
  }
  catch {
    return null;
  }
  const planned = decoded.map(m => ({
    ...m,
    die: state.remainingDice[m.dieIndex],
  }));
  let snap = state;
  for (let i = 0; i < planned.length; i++) {
    const legal = nextPlannedMove(snap, planned.slice(i));
    if (!legal)
      return null;
    snap = applyMove(snap, legal);
  }
  if (snap.phase === 'moving' && snap.currentPlayer === state.currentPlayer)
    return null;
  return planned;
}
