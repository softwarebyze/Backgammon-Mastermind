import type { PathSegment } from '@/features/game/components/board/move-path-overlay';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry, MoveLogTurn } from '@/lib/game/move-log';
import { buildTurnPathSegments } from '@/features/game/use-review-turn-loop';

/** Whole-turn path arrows; dim non-active hops while one is mid-flight. */
export function reviewPathSegments(args: {
  isReviewing: boolean;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  focusedTurn: MoveLogTurn | null;
  loopDisplayPly: number | null;
  hasLoopAnimation: boolean;
}): PathSegment[] {
  const { isReviewing, replayBaseline, moveLog, focusedTurn, loopDisplayPly, hasLoopAnimation } = args;
  if (!isReviewing || !replayBaseline || !focusedTurn) {
    return [];
  }
  const segments = buildTurnPathSegments(replayBaseline, moveLog, focusedTurn);
  const activePly = loopDisplayPly !== null && hasLoopAnimation
    ? loopDisplayPly + 1
    : null;
  return segments.map(seg => ({
    ...seg,
    active: activePly === null || seg.entry.ply === activePly,
  }));
}
