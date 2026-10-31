import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import type { MoveLogEntry } from '@/lib/game/move-log';

import {
  buildRedoHistoryStep,
  buildUndoHistoryStep,
  countTrailingNoMoves,
  redoInstant,
  undoMany,
} from '@/features/game/timeline-history-actions';
import {
  canRedoTimeline,
  canUndoTimeline,
  peekRedoMove,
} from '@/lib/game/game-timeline';
import { isNoMoveLogEntry } from '@/lib/game/move-log';

type HistoryAnimCtx = {
  timeline: GameTimeline;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
  gameMode: GameState['mode'] | undefined;
  /** Board on screen right now (may be ahead of the timeline snapshot, e.g. a fresh roll). */
  getLiveState: () => GameState | null;
  popLastMove: () => MoveLogEntry | null;
  restoreMove: (entry: MoveLogEntry) => void;
  setTimeline: Dispatch<SetStateAction<GameTimeline | null>>;
  setState: Dispatch<SetStateAction<GameState | null>>;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  setHistoryPath: Dispatch<SetStateAction<{ entry: MoveLogEntry; beforeState: GameState } | null>>;
  finishHistoryAnim: () => void;
  /** Shared with playMove so interrupted undo/redo still commits. */
  armAnimationFinish: (onFinish: () => void) => () => void;
  /**
   * Confirm-hold Undo: skip the post-undo historyPath flash. That overlay draws
   * the undone ply (often to an empty point) and looks mis-anchored after the
   * confirm bar leaves; hold arrows already update/clear from moveLog.
   */
  suppressHistoryPath?: boolean;
  /** Live input commits history synchronously; review retains settle-time semantics. */
  startCommittedFrame?: (frame: MoveAnimationFrame, before: GameState) => void;
};

/** vs-computer rewinds past the AI's moves as well as blocked rolls. */
function isAutoRewound(entry: MoveLogEntry, mode: GameState['mode'] | undefined): boolean {
  return isNoMoveLogEntry(entry) || (mode === 'vs-computer' && entry.player === 'black');
}

function countTrailingAutoRewound(moveLog: MoveLogEntry[], mode: GameState['mode'] | undefined): number {
  let count = 0;
  for (let i = moveLog.length - 1; i >= 0 && isAutoRewound(moveLog[i]!, mode); i--) {
    count++;
  }
  return count;
}

/** Commit a compound as one input, while each checker leg keeps its own flight. */
function undoCommittedAction(ctx: HistoryAnimCtx, count: number) {
  let timeline = ctx.timeline;
  let before = ctx.getLiveState();
  for (let i = 0; i < count; i++) {
    const step = buildUndoHistoryStep({
      replayBaseline: ctx.replayBaseline!,
      moveLog: ctx.moveLog,
      undoPly: timeline.cursor,
      onFinish: () => {},
    });
    const result = undoMany(timeline, 1, { popLastMove: ctx.popLastMove, liveState: before });
    if (!result) {
      break;
    }
    if (step?.frame && before) {
      ctx.startCommittedFrame!(step.frame, before);
    }
    timeline = result.nextTimeline;
    before = result.nextState;
  }
  ctx.setTimeline(timeline);
  if (before) {
    ctx.setState(before);
  }
}

// eslint-disable-next-line max-lines-per-function -- grouped live history and legacy settle-time review
export function runAnimatedUndo(ctx: HistoryAnimCtx): boolean {
  const { replayBaseline, popLastMove, setTimeline, setState, finishHistoryAnim, getLiveState } = ctx;
  const { timeline, moveLog } = ctx;

  // vs-computer: rewind trailing AI moves too, so undo always lands on the
  // human's own move (undoing only an AI move makes the AI replay it). Blocked
  // rolls are stepped over in every mode. Nothing is committed until the real
  // move is popped as well — the intermediate snapshots are black-to-move
  // states that would wake the AI.
  const autoRewound = countTrailingAutoRewound(moveLog, ctx.gameMode);
  const lastIndex = moveLog.length - autoRewound - 1;
  const actionId = moveLog[lastIndex]?.actionId;
  let actionLength = 1;
  if (actionId != null) {
    while (moveLog[lastIndex - actionLength]?.actionId === actionId) {
      actionLength++;
    }
  }
  const needsBatch = actionLength > 1 || (ctx.gameMode === 'vs-computer' && autoRewound > 0);

  // The log can hold nothing but passes and AI moves: nothing real to undo.
  if (autoRewound >= moveLog.length || autoRewound >= timeline.cursor) {
    return true;
  }

  // Human compounds commit as one input and retain each visual checker leg.
  if (actionLength > 1 && autoRewound === 0 && replayBaseline && ctx.startCommittedFrame) {
    undoCommittedAction(ctx, actionLength);
    return true;
  }

  // AI rewinds stay atomic: intermediate black-to-move states would wake AI.
  if (needsBatch || !replayBaseline) {
    const result = undoMany(timeline, autoRewound + actionLength, { popLastMove, liveState: getLiveState() });
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  // Blocked rolls after the move ride along with it: the log and timeline keep
  // one ply each, so the move to animate sits behind them.
  const passes = countTrailingNoMoves(moveLog);

  const commitUndo = () => {
    const undone: MoveLogEntry[] = [];
    for (let i = 0; i <= passes; i++) {
      const entry = popLastMove();
      if (!entry) {
        break;
      }
      undone.push(entry);
    }
    if (undone.length === 0) {
      finishHistoryAnim();
      return;
    }
    setTimeline((t) => {
      if (!t) {
        return t;
      }
      const result = undoMany(t, undone.length, {
        popLastMove: () => undone.shift() ?? null,
        liveState: getLiveState(),
      });
      if (!result) {
        return t;
      }
      setState(result.nextState);
      return result.nextTimeline;
    });
    finishHistoryAnim();
  };

  const step = buildUndoHistoryStep({
    replayBaseline,
    moveLog,
    undoPly: timeline.cursor - passes,
    onFinish: commitUndo,
  });

  if (!step?.frame) {
    const result = undoMany(timeline, passes + 1, { popLastMove, liveState: getLiveState() });
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  if (ctx.startCommittedFrame) {
    const before = getLiveState();
    const result = undoMany(timeline, passes + 1, { popLastMove, liveState: before });
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
      ctx.setHistoryPath(ctx.suppressHistoryPath ? null : step.path);
      if (before) {
        ctx.startCommittedFrame({ ...step.frame, onFinish: () => {} }, before);
      }
    }
    return true;
  }

  const settle = ctx.armAnimationFinish(commitUndo);
  if (ctx.suppressHistoryPath) {
    ctx.setHistoryPath(null);
  }
  else {
    ctx.setHistoryPath(step.path);
  }
  ctx.setMoveAnimation({ ...step.frame, onFinish: settle });
  return true;
}

export function runAnimatedRedo(ctx: HistoryAnimCtx): boolean {
  const { timeline, moveLog, replayBaseline, restoreMove, setTimeline, setState, finishHistoryAnim } = ctx;
  const moveEntry = peekRedoMove(timeline);
  if (!moveEntry) {
    return false;
  }

  if (moveEntry.actionId && timeline.redoMoves[1]?.actionId === moveEntry.actionId) {
    let next = timeline;
    let before = ctx.getLiveState();
    let log = moveLog;
    while (peekRedoMove(next)?.actionId === moveEntry.actionId) {
      const entry = peekRedoMove(next)!;
      const step = replayBaseline && ctx.startCommittedFrame
        ? buildRedoHistoryStep({ replayBaseline, moveLog: log, moveEntry: entry, cursor: next.cursor, onFinish: () => {} })
        : null;
      const result = redoInstant(next, restoreMove);
      if (!result) {
        break;
      }
      if (step?.frame && before) {
        ctx.startCommittedFrame!(step.frame, before);
      }
      before = result.nextState;
      log = [...log, entry];
      next = result.nextTimeline;
      setState(result.nextState);
    }
    setTimeline(next);
    return true;
  }

  if (!replayBaseline) {
    const result = redoInstant(timeline, restoreMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  const commitRedo = () => {
    setTimeline((t) => {
      if (!t || !canRedoTimeline(t)) {
        return t;
      }
      const result = redoInstant(t, restoreMove);
      if (!result) {
        return t;
      }
      setState(result.nextState);
      return result.nextTimeline;
    });
    finishHistoryAnim();
  };

  const step = buildRedoHistoryStep({
    replayBaseline,
    moveLog,
    moveEntry,
    cursor: timeline.cursor,
    onFinish: commitRedo,
  });

  if (!step.frame) {
    const result = redoInstant(timeline, restoreMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  if (ctx.startCommittedFrame) {
    const before = ctx.getLiveState();
    const result = redoInstant(timeline, restoreMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
      ctx.setHistoryPath(step.path);
      if (before) {
        ctx.startCommittedFrame({ ...step.frame, onFinish: () => {} }, before);
      }
    }
    return true;
  }

  const settle = ctx.armAnimationFinish(commitRedo);
  ctx.setHistoryPath(step.path);
  ctx.setMoveAnimation({ ...step.frame, onFinish: settle });
  return true;
}

export function canRunUndo(timeline: GameTimeline | null, isAnimating: boolean): timeline is GameTimeline {
  return timeline != null && canUndoTimeline(timeline) && !isAnimating;
}

export function canRunRedo(timeline: GameTimeline | null, isAnimating: boolean): timeline is GameTimeline {
  return timeline != null && canRedoTimeline(timeline) && !isAnimating;
}
