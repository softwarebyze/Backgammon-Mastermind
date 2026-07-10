import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { HistoryPathOverlay } from '@/features/game/timeline-history-actions';
import type { GameState } from '@/lib/game';
import type { GameTimeline } from '@/lib/game/game-timeline';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useEffect, useRef, useState } from 'react';

import { hasUndoableHumanMove, isHumanHistoryStep } from '@/features/game/timeline-history-actions';
import {
  canRunRedo,
  canRunUndo,
  runAnimatedRedo,
  runAnimatedUndo,
} from '@/features/game/timeline-history-runner';
import { canRedoTimeline, canUndoTimeline, peekRedoMove } from '@/lib/game/game-timeline';

export type { HistoryPathOverlay } from '@/features/game/timeline-history-actions';

type Options = {
  timeline: GameTimeline | null;
  setTimeline: Dispatch<SetStateAction<GameTimeline | null>>;
  setState: Dispatch<SetStateAction<GameState | null>>;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  isAnimating: boolean;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  /** Wire history onFinish into the shared animation watchdog. */
  armAnimationFinish: (onFinish: () => void) => () => void;
  popLastMove: () => MoveLogEntry | null;
  restoreMove: (entry: MoveLogEntry) => void;
  gameMode: GameState['mode'] | undefined;
};

/** Live undo/redo — animates like review scrubbing, then commits timeline + move log. */
export function useGameUndoRedo(options: Options) {
  const {
    timeline,
    setTimeline,
    setState,
    replayBaseline,
    moveLog,
    isAnimating,
    setMoveAnimation,
    armAnimationFinish,
    popLastMove,
    restoreMove,
    gameMode,
  } = options;

  // vs-computer: undo rewinds trailing AI moves and lands on the human's own
  // move; redo only replays human moves (the live AI replays its own turn).
  const canUndo = timeline != null && canUndoTimeline(timeline)
    && hasUndoableHumanMove(gameMode, moveLog);
  const canRedo = timeline != null && canRedoTimeline(timeline)
    && isHumanHistoryStep(gameMode, peekRedoMove(timeline));

  const [historyPath, setHistoryPath] = useState<HistoryPathOverlay | null>(null);
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;
  const moveLogRef = useRef(moveLog);
  moveLogRef.current = moveLog;
  const pathClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishHistoryAnim = useCallback(() => {
    setMoveAnimation(null);
    // Hold then clear — avoids an arrow flicker the instant the checker lands.
    if (pathClearTimerRef.current !== null) {
      clearTimeout(pathClearTimerRef.current);
    }
    pathClearTimerRef.current = setTimeout(() => {
      pathClearTimerRef.current = null;
      setHistoryPath(null);
    }, 700);
  }, [setMoveAnimation]);

  const clearHistoryPath = useCallback(() => {
    if (pathClearTimerRef.current !== null) {
      clearTimeout(pathClearTimerRef.current);
      pathClearTimerRef.current = null;
    }
    setHistoryPath(null);
  }, []);

  useEffect(() => () => {
    if (pathClearTimerRef.current !== null) {
      clearTimeout(pathClearTimerRef.current);
    }
  }, []);

  const animCtx = useCallback(() => ({
    timeline: timelineRef.current!,
    moveLog: moveLogRef.current,
    replayBaseline,
    gameMode,
    popLastMove,
    restoreMove,
    setTimeline,
    setState,
    setMoveAnimation,
    setHistoryPath,
    finishHistoryAnim,
    armAnimationFinish,
  }), [
    armAnimationFinish,
    finishHistoryAnim,
    gameMode,
    popLastMove,
    replayBaseline,
    restoreMove,
    setMoveAnimation,
    setState,
    setTimeline,
  ]);

  const doUndo = useCallback(() => {
    if (!canUndo || !canRunUndo(timelineRef.current, isAnimating)) {
      return;
    }
    runAnimatedUndo(animCtx());
  }, [animCtx, canUndo, isAnimating]);

  const doRedo = useCallback(() => {
    if (!canRedo || !canRunRedo(timelineRef.current, isAnimating)) {
      return;
    }
    runAnimatedRedo(animCtx());
  }, [animCtx, canRedo, isAnimating]);

  return { doUndo, doRedo, canUndo, canRedo, historyPath, clearHistoryPath };
}
