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
 * vs-computer: undo rewinds trailing AI moves automatically, so it's available
 * whenever the human has any move to return to.
 */
export function hasUndoableHumanMove(
  mode: GameState['mode'] | undefined,
  moveLog: MoveLogEntry[],
): boolean {
  if (mode !== 'vs-computer') {
    return true;
  }
  return moveLog.some(entry => entry.player === 'white');
}

export function undoInstant(
  timeline: GameTimeline,
  popLastMove: () => MoveLogEntry | null,
): { nextTimeline: GameTimeline; nextState: GameState } | null {
  if (!canUndoTimeline(timeline)) {
    return null;
  }
  const undoneMove = popLastMove();
  if (!undoneMove) {
    return null;
  }
  const nextTimeline = undoTimeline(timeline, undoneMove);
  return { nextTimeline, nextState: currentTimelineState(nextTimeline) };
}

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
  const nextTimeline = redoTimeline(timeline);
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
