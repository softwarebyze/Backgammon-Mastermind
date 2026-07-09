import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { hapticLight } from '@/lib/haptics';

type Options = {
  liveState: GameState | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
};

export function useMoveReview({ liveState, moveLog, replayBaseline }: Options) {
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
    if (liveIndex === 0 || (manualIndex !== null && manualIndex > liveIndex)) {
      animation.goLive();
    }
  }, [animation, liveIndex, manualIndex]);

  return {
    viewIndex,
    liveIndex,
    isReviewing: plies.isReviewing,
    canStepBack: (plies.isReviewing ? effectivePly > 0 : liveIndex > 0) && !animation.isFading,
    canStepForward: plies.isReviewing && !animation.isFading,
    displayState,
    reviewAnimation: loop.loopAnimation ?? animation.reviewAnimation,
    boardOpacity: animation.boardOpacity,
    isNavigating: animation.isNavigating,
    pathSegments,
    positionLabel,
    effectivePly,
    focusedPly: plies.scrubberPly,
    ...nav,
    isLooping: looping,
    toggleReplay,
    canReplay: loop.canReplay,
  };
}

function useReviewTurnNav(args: {
  animation: ReturnType<typeof useReviewStepAnimation>;
  effectivePly: number;
  isReviewing: boolean;
  liveIndex: number;
  moveLog: MoveLogEntry[];
  setManualIndex: (v: number | null) => void;
  setLooping: (v: boolean) => void;
}) {
  const { animation, effectivePly, isReviewing, liveIndex, moveLog, setManualIndex, setLooping } = args;

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
      // Enter review parked on the last completed turn — static, not looping.
      if (liveIndex > 0) {
        enterReviewAt(liveIndex);
      }
      return;
    }
    if (effectivePly > 0) {
      navigate(previousTurnEndPly(moveLog, effectivePly));
    }
  }, [animation.isFading, effectivePly, enterReviewAt, isReviewing, liveIndex, moveLog, navigate]);

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
