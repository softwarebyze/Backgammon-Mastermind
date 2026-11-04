import type { GameState, Move } from '@/lib/game';

import { BAR_POINT } from '@/lib/game/constants';
import { findMoveSequence, getLegalMoves } from '@/lib/game/moves';
import { getSingleDestinationSequence } from '@/lib/game/single-move';

export type BoardTapResolution
  = | { type: 'nudge' }
    | { type: 'clear' }
    | { type: 'noop' }
    | { type: 'select'; point: number }
    | { type: 'play'; sequence: Move[] };

/** The tapped point holds one of the mover's checkers (or is an occupied bar). */
function isOwnSource(state: GameState, point: number): boolean {
  if (point === BAR_POINT) {
    return state.bar[state.currentPlayer] > 0;
  }
  if (point < 1 || point > 24) {
    return false;
  }
  return state.points[point].player === state.currentPlayer && state.points[point].count > 0;
}

/**
 * Turn a board-point tap into the next input action. `selection` is the point
 * that is selected right now (or the UI's queued selection when the tap is
 * replayed after an animation settles).
 *
 * Pure on purpose: the live tap handler and the queued-input drain share it, so
 * rapid follow-ups resolve exactly like a tap would from the settled state.
 */
export function resolveBoardTap(
  state: GameState,
  selection: number | null,
  point: number,
): BoardTapResolution {
  if (state.phase === 'rolling' || state.phase === 'opening-roll') {
    return { type: 'nudge' };
  }
  if (state.phase !== 'moving') {
    return { type: 'clear' };
  }

  if (selection !== null) {
    if (selection === point) {
      return { type: 'clear' };
    }
    const legalFrom = getLegalMoves(state).filter(m => m.from === selection);
    const single = legalFrom.find(m => m.to === point);
    if (single) {
      return { type: 'play', sequence: [single] };
    }
    const sequence = findMoveSequence({ ...state, selectedPoint: selection }, selection, point);
    if (sequence && sequence.length > 0) {
      return { type: 'play', sequence };
    }
  }

  if (!isOwnSource(state, point)) {
    return { type: 'clear' };
  }
  if (getLegalMoves(state).every(m => m.from !== point)) {
    // Own checker with no usable die: keep the current selection, as selectPoint does.
    return { type: 'noop' };
  }
  const onlyDest = getSingleDestinationSequence(state, point);
  if (onlyDest) {
    return { type: 'play', sequence: onlyDest };
  }
  return { type: 'select', point };
}
