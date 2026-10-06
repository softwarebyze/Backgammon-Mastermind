import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { GameState, Player } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';

import { buildTurnPathSegments } from '@/features/game/use-review-turn-loop';
import { groupMoveLogByTurn } from '@/lib/game/move-log';

/**
 * Whole-turn dashed arrows while Confirm move is holding the turn.
 * Reuses review's PathSegment builder so Undo/redo shrink/grow the set and
 * Confirm / turn change clear it (caller gates on `awaitingConfirm`).
 */
export function confirmHoldPathSegments(args: {
  awaitingConfirm: boolean;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  currentPlayer?: Player;
}): PathSegment[] {
  const { awaitingConfirm, replayBaseline, moveLog, currentPlayer } = args;
  if (!awaitingConfirm || !replayBaseline || moveLog.length === 0) {
    return [];
  }
  const turn = groupMoveLogByTurn(moveLog).at(-1);
  if (!turn) {
    return [];
  }
  if (currentPlayer !== undefined && turn.player !== currentPlayer) {
    return [];
  }
  return buildTurnPathSegments(replayBaseline, moveLog, turn);
}
