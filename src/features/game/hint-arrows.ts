import type { PathSegment } from './components/board/move-path-overlay';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState, Move } from '@/lib/game/types';

import { applyMove, getLegalMoves } from '@/lib/game/moves';

/**
 * Convert a hint's suggested move sequence into board overlay segments so
 * the suggested turn draws as arrows on the board (reuses the review-mode
 * MovePathOverlay with its dashed-arrow style).
 *
 * Each hint move is re-resolved against the app's own legal moves before
 * applying, so dieIndex bookkeeping stays correct as dice are consumed.
 * Stops at the first hint move that isn't legal from the current position.
 *
 * `tone` colors the arrows: 'mine' (the player's own path, orange) vs
 * 'engine' (the recommended path, green) — see MovePathOverlay.
 */
export function hintMovesToSegments(
  moves: Move[],
  startState: GameState,
  tone?: PathSegment['tone'],
): PathSegment[] {
  const segments: PathSegment[] = [];
  let snap = startState;
  for (let i = 0; i < moves.length; i++) {
    const planned = moves[i];
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal)
      break;
    const entry: MoveLogEntry = {
      ply: i + 1,
      player: snap.currentPlayer,
      dice: startState.dice,
      from: legal.from,
      to: legal.to,
    };
    segments.push({ entry, beforeState: snap, tone });
    snap = applyMove(snap, legal);
  }
  return segments;
}
