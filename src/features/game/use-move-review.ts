import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatReviewPositionLabel, performReviewJump } from '@/features/game/review-helpers';
import {
  applyReviewPresenterOverlay,
  reviewBeforeStateForHighlight,
  reviewDisplayPly,
  reviewEffectivePly,
  reviewHighlightMovePly,
  reviewMoveEntry,
} from '@/features/game/review-navigation';
import { useReviewStepAnimation } from '@/features/game/use-review-step-animation';
import { stateAtPly } from '@/lib/game/move-replay';
import { hapticLight } from '@/lib/haptics';

type Options = {
  liveState: GameState | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
};

function useReviewResetOnLogClear(
  liveIndex: number,
  manualIndex: number | null,
  goLive: () => void,
) {
  useEffect(() => {
    if (liveIndex === 0 || (manualIndex !== null && manualIndex > liveIndex)) {
      goLive();
    }
  }, [goLive, liveIndex, manualIndex]);
}

export function useMoveReview({ liveState, moveLog, replayBaseline }: Options) {
  const liveIndex = moveLog.length;
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const animation = useReviewStepAnimation({
    replayBaseline,
    moveLog,
    liveIndex,
    setManualIndex,
  });

  const viewIndex = manualIndex ?? liveIndex;
  const effectivePly = reviewEffectivePly(viewIndex, animation.pendingAnimTarget);
  const isReviewing = manualIndex !== null || animation.pendingAnimTarget !== null;
  const canStepBack = effectivePly > 0;
  const canStepForward = isReviewing;

  const highlightMovePly = reviewHighlightMovePly(
    viewIndex,
    animation.pendingAnimTarget,
    animation.pendingAnimDirection,
  );
  const displayPly = isReviewing
    ? reviewDisplayPly(viewIndex, animation.pendingAnimTarget, animation.pendingAnimDirection)
    : liveIndex;

  const displayState = useMemo(() => {
    if (!liveState) {
      return null;
    }
    if (!isReviewing || !replayBaseline) {
      return liveState;
    }
    const snap = stateAtPly(replayBaseline, moveLog, displayPly);
    return applyReviewPresenterOverlay(moveLog, displayPly, snap);
  }, [displayPly, isReviewing, replayBaseline, moveLog, liveState]);

  const activeEntry = useMemo(
    () => (isReviewing ? reviewMoveEntry(moveLog, highlightMovePly) : null),
    [highlightMovePly, isReviewing, moveLog],
  );

  const reviewBeforeState = useMemo(
    () => (isReviewing ? reviewBeforeStateForHighlight(replayBaseline, moveLog, highlightMovePly) : null),
    [highlightMovePly, isReviewing, moveLog, replayBaseline],
  );

  const positionLabel = useMemo(
    () => (isReviewing ? formatReviewPositionLabel(highlightMovePly ?? viewIndex, liveIndex, moveLog) : null),
    [highlightMovePly, isReviewing, viewIndex, liveIndex, moveLog],
  );

  const stepBack = useCallback(() => {
    if (!canStepBack) {
      return;
    }
    hapticLight();
    animation.stepBack(effectivePly);
  }, [animation, canStepBack, effectivePly]);

  const goLive = useCallback(() => {
    hapticLight();
    animation.goLive();
  }, [animation]);

  const stepForward = useCallback(() => {
    if (!isReviewing) {
      return;
    }
    if (effectivePly >= liveIndex) {
      goLive();
      return;
    }
    hapticLight();
    animation.stepForward(effectivePly);
  }, [animation, effectivePly, goLive, isReviewing, liveIndex]);

  const jumpToPly = useCallback((ply: number) => {
    performReviewJump({
      ply,
      effectivePly: reviewEffectivePly(viewIndex, animation.pendingAnimTarget),
      liveIndex,
      playStepAnimation: animation.playStepAnimation,
      setManualIndex,
      setPendingAnimTarget: animation.setPendingAnimTarget,
      setPendingAnimDirection: animation.setPendingAnimDirection,
      cancelAnimation: animation.cancelAnimation,
    });
  }, [animation, liveIndex, viewIndex]);

  useReviewResetOnLogClear(liveIndex, manualIndex, animation.goLive);

  return {
    viewIndex,
    liveIndex,
    isReviewing,
    canStepBack,
    canStepForward,
    displayState,
    reviewAnimation: animation.reviewAnimation,
    activeEntry,
    reviewBeforeState,
    positionLabel,
    effectivePly,
    focusedPly: animation.pendingAnimTarget ?? viewIndex,
    stepBack,
    stepForward,
    jumpToPly,
    goLive,
  };
}
