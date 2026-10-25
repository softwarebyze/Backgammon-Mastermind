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
  state: GameState | null;
  prepareHistory?: () => void;
  getTimeline?: () => GameTimeline | null;
  getMoveLog?: () => MoveLogEntry[];
  getMoveState?: () => GameState | null;
  commitHistoryState?: (next: GameState) => void;
  startCommittedFrame?: (frame: MoveAnimationFrame, before: GameState) => void;
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
  /** When true at undo time, skip the dashed historyPath flash (confirm-hold). */
  shouldSuppressHistoryPath?: () => boolean;
};

/** Live history commits on input; independently keyed flights only change visuals. */
// eslint-disable-next-line max-lines-per-function -- synchronous history mirrors and legacy review compatibility
export function useGameUndoRedo(options: Options) {
  const {
    state,
    prepareHistory,
    getMoveState,
    getMoveLog,
    getTimeline,
    commitHistoryState,
    startCommittedFrame,
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
    shouldSuppressHistoryPath,
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const getLiveState = useCallback(() => getMoveState?.() ?? stateRef.current, [getMoveState]);
  const readTimeline = useCallback(() => getTimeline?.() ?? timelineRef.current, [getTimeline]);
  const readLog = useCallback(() => getMoveLog?.() ?? moveLogRef.current, [getMoveLog]);
  const commitTimeline = useCallback<Options['setTimeline']>((update) => {
    const next = typeof update === 'function' ? update(readTimeline()) : update;
    timelineRef.current = next;
    setTimeline(next);
  }, [readTimeline, setTimeline]);
  const commitState = useCallback<Options['setState']>((update) => {
    const next = typeof update === 'function' ? update(getLiveState()) : update;
    stateRef.current = next;
    if (next && commitHistoryState) {
      commitHistoryState(next);
    }
    else {
      setState(next);
    }
  }, [getLiveState, commitHistoryState, setState]);
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
    timeline: readTimeline()!,
    moveLog: readLog(),
    replayBaseline: replayBaseline ?? readTimeline()?.snapshots[0] ?? null,
    gameMode,
    getLiveState,
    popLastMove: () => {
      const entry = popLastMove();
      moveLogRef.current = moveLogRef.current.slice(0, -1);
      return entry;
    },
    restoreMove: (entry: MoveLogEntry) => {
      restoreMove(entry);
      moveLogRef.current = [...moveLogRef.current, entry];
    },
    setTimeline: commitTimeline,
    setState: commitState,
    startCommittedFrame,
    setMoveAnimation,
    setHistoryPath,
    finishHistoryAnim,
    armAnimationFinish,
    suppressHistoryPath: shouldSuppressHistoryPath?.() === true,
  }), [
    armAnimationFinish,
    commitState,
    commitTimeline,
    startCommittedFrame,
    readLog,
    readTimeline,
    finishHistoryAnim,
    gameMode,
    getLiveState,
    popLastMove,
    replayBaseline,
    restoreMove,
    setMoveAnimation,
    shouldSuppressHistoryPath,
  ]);

  const doUndo = useCallback(() => {
    prepareHistory?.();
    const live = readTimeline();
    if (!canRunUndo(live, false) || !hasUndoableHumanMove(gameMode, readLog())
      || (isAnimating && !startCommittedFrame)) {
      return false;
    }
    clearHistoryPath();
    return runAnimatedUndo(animCtx());
  }, [animCtx, clearHistoryPath, gameMode, isAnimating, prepareHistory, startCommittedFrame, readLog, readTimeline]);

  const doRedo = useCallback(() => {
    prepareHistory?.();
    const live = readTimeline();
    if (!canRunRedo(live, false) || !isHumanHistoryStep(gameMode, peekRedoMove(live))
      || (isAnimating && !startCommittedFrame)) {
      return false;
    }
    clearHistoryPath();
    return runAnimatedRedo(animCtx());
  }, [animCtx, clearHistoryPath, gameMode, isAnimating, prepareHistory, startCommittedFrame, readTimeline]);

  useEffect(() => {
    if (!isAnimating && historyPath) {
      pathClearTimerRef.current = setTimeout(() => setHistoryPath(null), 700);
      return () => {
        if (pathClearTimerRef.current !== null) {
          clearTimeout(pathClearTimerRef.current);
        }
      };
    }
  }, [historyPath, isAnimating]);

  return { doUndo, doRedo, canUndo, canRedo, historyPath, clearHistoryPath };
}
