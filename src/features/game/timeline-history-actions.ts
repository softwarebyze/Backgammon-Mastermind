import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import type { MoveLogEntry } from '@/lib/game/move-log';

import {
  buildReviewStepAnimation,
  buildReviewStepBackAnimation,
} from '@/features/game/review-helpers';
import {
  canRedoTimeline,
  canUndoTimeline,
  currentTimelineState,
  peekRedoMove,
  redoTimeline,
  undoTimeline,
} from '@/lib/game/game-timeline';
import { isNoMoveLogEntry } from '@/lib/game/move-log';
import { stateAtPly } from '@/lib/game/move-replay';

export type HistoryPathOverlay = {
  entry: MoveLogEntry;
  beforeState: GameState;
};

/**
 * vs-computer: redo only replays the human's (White's) moves — redoing an AI
 * move would fight the live AI, which replays its turn itself.
 */
export function isHumanHistoryStep(
  mode: GameState['mode'] | undefined,
  entry: MoveLogEntry | null | undefined,
): boolean {
  if (mode !== 'vs-computer') {
    return true;
  }
  return entry?.player === 'white';
}

/**
 * Undo needs a real move to return to. Blocked rolls ("no move") are stepped
 * over, and vs-computer undo also rewinds the AI, so it is available whenever
 * the human has any actual move to return to.
 */
export function hasUndoableHumanMove(
  mode: GameState['mode'] | undefined,
  moveLog: MoveLogEntry[],
): boolean {
  return moveLog.some(entry =>
    !isNoMoveLogEntry(entry) && (mode !== 'vs-computer' || entry.player === 'white'),
  );
}

/** Blocked rolls at the end of the log, which undo steps over with the move before them. */
export function countTrailingNoMoves(moveLog: MoveLogEntry[]): number {
  let count = 0;
  for (let i = moveLog.length - 1; i >= 0 && isNoMoveLogEntry(moveLog[i]!); i--) {
    count++;
  }
  return count;
}

/**
 * Pop `count` log entries (newest first) and rewind the timeline one ply per
 * entry. `liveState` only applies to the first ply: it is the board the
 * player is looking at right now.
 */
export function undoMany(
  timeline: GameTimeline,
  count: number,
  opts: { popLastMove: () => MoveLogEntry | null; liveState?: GameState | null },
): { nextTimeline: GameTimeline; nextState: GameState } | null {
  const { popLastMove, liveState } = opts;
  let nextTimeline = timeline;
  let live = liveState;
  let undone = 0;
  for (let i = 0; i < count && canUndoTimeline(nextTimeline); i++) {
    const entry = popLastMove();
    if (!entry) {
      break;
    }
    nextTimeline = undoTimeline(nextTimeline, entry, live);
    live = null;
    undone++;
  }
  return undone > 0
    ? { nextTimeline, nextState: currentTimelineState(nextTimeline) }
    : null;
}

export function undoInstant(
  timeline: GameTimeline,
  popLastMove: () => MoveLogEntry | null,
  liveState?: GameState | null,
): { nextTimeline: GameTimeline; nextState: GameState } | null {
  return undoMany(timeline, 1, { popLastMove, liveState });
}

/**
 * Redo one entry, plus any blocked rolls right after it: a pass is not a
 * move the player can step onto, so redo carries them along.
 */
export function redoInstant(
  timeline: GameTimeline,
  restoreMove: (entry: MoveLogEntry) => void,
): { nextTimeline: GameTimeline; nextState: GameState; entry: MoveLogEntry } | null {
  if (!canRedoTimeline(timeline)) {
    return null;
  }
  const moveEntry = peekRedoMove(timeline);
  if (!moveEntry) {
    return null;
  }
  restoreMove(moveEntry);
  let nextTimeline = redoTimeline(timeline);
  for (
    let next = peekRedoMove(nextTimeline);
    next && isNoMoveLogEntry(next);
    next = peekRedoMove(nextTimeline)
  ) {
    restoreMove(next);
    nextTimeline = redoTimeline(nextTimeline);
  }
  return { nextTimeline, nextState: currentTimelineState(nextTimeline), entry: moveEntry };
}

export function buildUndoHistoryStep(ctx: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  undoPly: number;
  onFinish: () => void;
}): { frame: MoveAnimationFrame | null; path: HistoryPathOverlay } | null {
  const { replayBaseline, moveLog, undoPly, onFinish } = ctx;
  const entry = moveLog[undoPly - 1];
  if (!entry) {
    return null;
  }
  const beforeState = stateAtPly(replayBaseline, moveLog, undoPly - 1);
  const frame = buildReviewStepBackAnimation({
    replayBaseline,
    moveLog,
    targetPly: undoPly - 1,
    onFinish,
  });
  return { frame, path: { entry, beforeState } };
}

export function buildRedoHistoryStep(ctx: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  moveEntry: MoveLogEntry;
  cursor: number;
  onFinish: () => void;
}): { frame: MoveAnimationFrame | null; path: HistoryPathOverlay } {
  const { replayBaseline, moveLog, moveEntry, cursor, onFinish } = ctx;
  const logWithRedo = [...moveLog, moveEntry];
  const targetPly = cursor + 1;
  const beforeState = stateAtPly(replayBaseline, moveLog, cursor);
  const frame = buildReviewStepAnimation({
    replayBaseline,
    moveLog: logWithRedo,
    targetPly,
    onFinish,
  });
  return { frame, path: { entry: moveEntry, beforeState } };
}
