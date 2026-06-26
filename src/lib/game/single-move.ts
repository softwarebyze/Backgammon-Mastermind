import type { GameState, Move } from './types';
import { getLegalMoves } from './moves';

/** True when exactly one distinct legal move exists (no real choice). */
export function hasExactlyOneLegalMove(state: GameState): boolean {
  if (state.phase !== 'moving') {
    return false;
  }
  const moves = getLegalMoves(state);
  if (moves.length !== 1) {
    return false;
  }
  return true;
}

export function getForcedLegalMove(state: GameState): Move | null {
  if (!hasExactlyOneLegalMove(state)) {
    return null;
  }
  return getLegalMoves(state)[0] ?? null;
}
