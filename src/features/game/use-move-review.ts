import type { GameState } from '@/lib/game';
import type { CubeHistoryEvent } from '@/lib/game/cube-history';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { formatReviewPositionLabel } from '@/features/game/review-helpers';
import { reviewEffectivePly } from '@/features/game/review-navigation';
import { reviewPathSegments } from '@/features/game/review-path-segments';
import { computeReviewPlies, useReviewDisplayState } from '@/features/game/use-review-display';
import { useReviewStepAnimation } from '@/features/game/use-review-step-animation';
import {
  nextTurnEndPly,
  previousTurnEndPly,
  turnContainingPly,
  useReviewTurnLoop,
} from '@/features/game/use-review-turn-loop';
import { chronologicalHistory } from '@/lib/game/cube-history';
import { groupMoveLogByTurn } from '@/lib/game/move-log';
import { hapticLight } from '@/lib/haptics';
import { GameContext } from './game-context';

type Options = {
  liveState: GameState | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
};

function lastCompletedTurnPly(
  moveLog: MoveLogEntry[],
  liveState: GameState | null,
  liveIndex: number,
): number {
  const turns = groupMoveLogByTurn(moveLog);
  const last = turns[turns.length - 1];
  const midTurn = !!liveState
    && liveState.phase === 'moving'
    && last?.player === liveState.currentPlayer;
  if (midTurn && turns.length >= 2) {
    return turns[turns.length - 2]!.endPly;
  }
  return last?.endPly ?? liveIndex;
}

/* eslint-disable max-lines-per-function -- review orchestration */
export function useMoveReview({ liveState, moveLog, replayBaseline }: Options) {
  const context = use(GameContext);
  const cubeEvents = context?.cubeEvents;
  const setReviewing = context?.setReviewing;
  const [selectedEvent, setSelectedEvent] = useState<CubeHistoryEvent | null>(null);
  const selectedCubeEvent = selectedEvent && cubeEvents?.includes(selectedEvent) ? selectedEvent : null;
  const liveIndex = moveLog.length;
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [looping, setLooping] = useState(false);
  const animation = useReviewStepAnimation({
    replayBaseline,
    moveLog,
    liveIndex,
    setManualIndex,
  });

  const viewIndex = manualIndex ?? liveIndex;
  const effectivePly = reviewEffectivePly(viewIndex, animation.pendingAnimTarget);
  const plies = computeReviewPlies({
    viewIndex,
    liveIndex,
    manualIndex,
    pendingAnimTarget: animation.pendingAnimTarget,
    pendingAnimDirection: animation.pendingAnimDirection,
    isFading: animation.isFading,
  });

  const isReviewing = plies.isReviewing || !!selectedCubeEvent;
  useEffect(() => {
    setReviewing?.(isReviewing);
    return () => setReviewing?.(false);
  }, [isReviewing, setReviewing]);

  const focusedTurn = useMemo(
    () => (plies.isReviewing ? turnContainingPly(moveLog, plies.scrubberPly) : null),
    [moveLog, plies.isReviewing, plies.scrubberPly],
  );

  const loop = useReviewTurnLoop({
    enabled: plies.isReviewing && !animation.isNavigating,
    looping,
    replayBaseline,
    moveLog,
    focusedPly: plies.scrubberPly,
    isNavigating: animation.isNavigating,
  });

  const { displayState } = useReviewDisplayState({
    cubeEvents,
    liveState,
    replayBaseline,
    moveLog,
    isReviewing: plies.isReviewing,
    displayPly: loop.loopDisplayPly ?? plies.displayPly,
    highlightMovePly: focusedTurn?.endPly ?? (animation.pathMovePly ?? plies.highlightMovePly),
    presenterPly: focusedTurn?.endPly ?? undefined,
  });

  const pathSegments = useMemo(
    () => reviewPathSegments({
      isReviewing: plies.isReviewing,
      replayBaseline,
      moveLog,
      focusedTurn,
      loopDisplayPly: loop.loopDisplayPly,
      hasLoopAnimation: loop.loopAnimation !== null,
    }),
    [focusedTurn, loop.loopAnimation, loop.loopDisplayPly, moveLog, plies.isReviewing, replayBaseline],
  );

  const positionLabel = useMemo(
    () => (plies.isReviewing ? formatReviewPositionLabel(plies.scrubberPly, liveIndex, moveLog) : null),
    [plies.isReviewing, plies.scrubberPly, liveIndex, moveLog],
  );

  const nav = useReviewTurnNav({
    animation,
    effectivePly,
    isReviewing: plies.isReviewing,
    liveIndex,
    liveState,
    moveLog,
    setManualIndex,
    setLooping,
  });

  const toggleReplay = useCallback(() => {
    hapticLight();
    setLooping((on) => {
      if (on) {
        return false;
      }
      loop.restartLoop();
      return true;
    });
  }, [loop]);

  useEffect(() => {
    if ((liveIndex === 0 && !cubeEvents?.length) || (manualIndex !== null && manualIndex > liveIndex)) {
      animation.goLive();
    }
  }, [animation, liveIndex, manualIndex, cubeEvents?.length]);

  // New game / reset: leave review immediately so opening ceremony sees live phase.
  useEffect(() => {
    if (liveState?.phase === 'opening-roll' && plies.isReviewing) {
      animation.goLive();
    }
  }, [animation, liveState?.phase, plies.isReviewing]);

  const jumpToCubeEvent = useCallback((id: number) => {
    animation.goLive();
    setLooping(false);
    setSelectedEvent(cubeEvents?.find(event => event.id === id) ?? null);
  }, [animation, cubeEvents]);
  const history = chronologicalHistory(groupMoveLogByTurn(moveLog), cubeEvents ?? []);
  const historyIndex = selectedCubeEvent
    ? history.findIndex(item => item.kind === 'cube' && item.event.id === selectedCubeEvent.id)
    : plies.isReviewing ? history.findIndex(item => item.kind === 'turn' && item.turn.endPly === focusedTurn?.endPly) : history.length;
  const stepHistory = (direction: -1 | 1) => {
    if (animation.isFading)
      return;
    if (!cubeEvents?.length) {
      if (direction === -1)
        nav.stepBack();
      else nav.stepForward();
      return;
    }
    const target = history[historyIndex + direction];
    if (target?.kind === 'cube') {
      jumpToCubeEvent(target.event.id);
      return;
    }
    setSelectedEvent(null);
    if (target?.kind === 'turn')
      nav.jumpToPly(target.turn.endPly);
    else if (direction === 1)
      nav.goLive();
    else nav.jumpToPly(0);
  };
  const clearEvent = (action: () => void) => () => {
    setSelectedEvent(null);
    action();
  };

  return {
    viewIndex,
    liveIndex,
    selectedCubeEventId: selectedCubeEvent?.id ?? null,
    jumpToCubeEvent,
    isReviewing: plies.isReviewing || !!selectedCubeEvent,
    canStepBack: (selectedCubeEvent ? true : plies.isReviewing ? effectivePly > 0 : history.length > 0) && !animation.isFading,
    canStepForward: (plies.isReviewing || !!selectedCubeEvent) && !animation.isFading,
    displayState: selectedCubeEvent?.after ?? displayState,
    reviewAnimation: loop.loopAnimation ?? animation.reviewAnimation,
    boardOpacity: animation.boardOpacity,
    isNavigating: animation.isNavigating,
    pathSegments: selectedCubeEvent ? [] : pathSegments,
    positionLabel: selectedCubeEvent ? null : positionLabel,
    effectivePly,
    focusedPly: plies.scrubberPly,
    /** Player whose turn is being reviewed (null when live). */
    reviewedPlayer: plies.isReviewing ? focusedTurn?.player ?? null : null,
    ...nav,
    goLive: clearEvent(nav.goLive),
    jumpToPly: (ply: number) => {
      setSelectedEvent(null);
      nav.jumpToPly(ply);
    },
    stepBack: () => stepHistory(-1),
    stepForward: () => stepHistory(1),
    isLooping: looping,
    toggleReplay,
    canReplay: !selectedCubeEvent && loop.canReplay,
  };
}

function useReviewTurnNav(args: {
  animation: ReturnType<typeof useReviewStepAnimation>;
  effectivePly: number;
  isReviewing: boolean;
  liveIndex: number;
  liveState: GameState | null;
  moveLog: MoveLogEntry[];
  setManualIndex: (v: number | null) => void;
  setLooping: (v: boolean) => void;
}) {
  const {
    animation,
    effectivePly,
    isReviewing,
    liveIndex,
    liveState,
    moveLog,
    setManualIndex,
    setLooping,
  } = args;

  const navigate = useCallback((ply: number) => {
    hapticLight();
    setLooping(false);
    animation.navigateToPly(effectivePly, ply);
  }, [animation, effectivePly, setLooping]);

  const goLive = useCallback(() => {
    hapticLight();
    setLooping(false);
    animation.goLive();
  }, [animation, setLooping]);

  const enterReviewAt = useCallback((ply: number) => {
    hapticLight();
    setLooping(false);
    setManualIndex(ply);
  }, [setLooping, setManualIndex]);

  const stepBack = useCallback(() => {
    if (animation.isFading) {
      return;
    }
    if (!isReviewing) {
      if (liveIndex > 0) {
        enterReviewAt(lastCompletedTurnPly(moveLog, liveState, liveIndex));
      }
      return;
    }
    if (effectivePly > 0) {
      navigate(previousTurnEndPly(moveLog, effectivePly));
    }
  }, [animation.isFading, effectivePly, enterReviewAt, isReviewing, liveIndex, liveState, moveLog, navigate]);

  const stepForward = useCallback(() => {
    if (!isReviewing || animation.isFading) {
      return;
    }
    if (effectivePly >= liveIndex) {
      goLive();
      return;
    }
    navigate(nextTurnEndPly(moveLog, effectivePly, liveIndex));
  }, [animation.isFading, effectivePly, goLive, isReviewing, liveIndex, moveLog, navigate]);

  const jumpToPly = useCallback((ply: number) => {
    if (ply > liveIndex) {
      goLive();
      return;
    }
    if (ply === liveIndex) {
      if (!isReviewing || effectivePly !== liveIndex) {
        enterReviewAt(liveIndex);
      }
      return;
    }
    navigate(ply);
  }, [effectivePly, enterReviewAt, goLive, isReviewing, liveIndex, navigate]);

  return { stepBack, stepForward, jumpToPly, goLive };
}
