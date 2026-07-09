import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import type { MoveLogEntry } from '@/lib/game/move-log';

import {
  buildRedoHistoryStep,
  buildUndoHistoryStep,
  redoInstant,
  undoInstant,
} from '@/features/game/timeline-history-actions';
import {
  canRedoTimeline,
  canUndoTimeline,
  currentTimelineState,
  peekRedoMove,
  redoTimeline,
  undoTimeline,
} from '@/lib/game/game-timeline';

type HistoryAnimCtx = {
  timeline: GameTimeline;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
  gameMode: GameState['mode'] | undefined;
  popLastMove: () => MoveLogEntry | null;
  restoreMove: (entry: MoveLogEntry) => void;
  setTimeline: Dispatch<SetStateAction<GameTimeline | null>>;
  setState: Dispatch<SetStateAction<GameState | null>>;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  setHistoryPath: Dispatch<SetStateAction<{ entry: MoveLogEntry; beforeState: GameState } | null>>;
  finishHistoryAnim: () => void;
};

export function runAnimatedUndo(ctx: HistoryAnimCtx): boolean {
  const { replayBaseline, popLastMove, setTimeline, setState, finishHistoryAnim } = ctx;
  let { timeline, moveLog } = ctx;

  // vs-computer: rewind trailing AI moves too, so undo always lands on the
  // human's own move (undoing only an AI move makes the AI replay it).
  // Nothing is committed until the human move is popped as well — the
  // intermediate snapshots are black-to-move states that would wake the AI.
  let poppedAIMoves = false;
  while (
    ctx.gameMode === 'vs-computer'
    && moveLog[moveLog.length - 1]?.player === 'black'
    && canUndoTimeline(timeline)
  ) {
    const result = undoInstant(timeline, popLastMove);
    if (!result) {
      break;
    }
    poppedAIMoves = true;
    timeline = result.nextTimeline;
    moveLog = moveLog.slice(0, -1);
  }

  if (!canUndoTimeline(timeline) || moveLog.length === 0) {
    if (poppedAIMoves) {
      setTimeline(timeline);
      setState(currentTimelineState(timeline));
    }
    return true;
  }

  // A multi-move rewind commits in one batch (no animation): animating the
  // final step would briefly show a black-to-move board and trigger the AI.
  if (poppedAIMoves || !replayBaseline) {
    const result = undoInstant(timeline, popLastMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    else if (poppedAIMoves) {
      setTimeline(timeline);
      setState(currentTimelineState(timeline));
    }
    return true;
  }

  const step = buildUndoHistoryStep({
    replayBaseline,
    moveLog,
    undoPly: timeline.cursor,
    onFinish: () => {
      const undoneMove = popLastMove();
      if (!undoneMove) {
        finishHistoryAnim();
        return;
      }
      setTimeline((t) => {
        if (!t) {
          return t;
        }
        const next = undoTimeline(t, undoneMove);
        setState(currentTimelineState(next));
        return next;
      });
      finishHistoryAnim();
    },
  });

  if (!step?.frame) {
    const result = undoInstant(timeline, popLastMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  ctx.setHistoryPath(step.path);
  ctx.setMoveAnimation(step.frame);
  return true;
}

export function runAnimatedRedo(ctx: HistoryAnimCtx): boolean {
  const { timeline, moveLog, replayBaseline, restoreMove, setTimeline, setState, finishHistoryAnim } = ctx;
  const moveEntry = peekRedoMove(timeline);
  if (!moveEntry) {
    return false;
  }

  if (!replayBaseline) {
    const result = redoInstant(timeline, restoreMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  const step = buildRedoHistoryStep({
    replayBaseline,
    moveLog,
    moveEntry,
    cursor: timeline.cursor,
    onFinish: () => {
      setTimeline((t) => {
        if (!t || !canRedoTimeline(t)) {
          return t;
        }
        const entry = peekRedoMove(t);
        if (!entry) {
          return t;
        }
        restoreMove(entry);
        const next = redoTimeline(t);
        setState(currentTimelineState(next));
        return next;
      });
      finishHistoryAnim();
    },
  });

  if (!step.frame) {
    const result = redoInstant(timeline, restoreMove);
    if (result) {
      setTimeline(result.nextTimeline);
      setState(result.nextState);
    }
    return true;
  }

  ctx.setHistoryPath(step.path);
  ctx.setMoveAnimation(step.frame);
  return true;
}

export function canRunUndo(timeline: GameTimeline | null, isAnimating: boolean): timeline is GameTimeline {
  return timeline != null && canUndoTimeline(timeline) && !isAnimating;
}

export function canRunRedo(timeline: GameTimeline | null, isAnimating: boolean): timeline is GameTimeline {
  return timeline != null && canRedoTimeline(timeline) && !isAnimating;
}
