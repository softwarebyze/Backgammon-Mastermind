import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useMemo, useState } from 'react';
import { formatReviewPositionLabel } from '@/features/game/review-helpers';
import { useReviewActions } from '@/features/game/use-review-actions';
import { stateAtPly } from '@/lib/game/move-replay';

type Options = {
  liveState: GameState | null;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
};

export { formatReviewPositionLabel } from '@/features/game/review-helpers';

export function useMoveReview({ liveState, moveLog, replayBaseline }: Options) {
  const liveIndex = moveLog.length;
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const [reviewAnimation, setReviewAnimation] = useState<MoveAnimationFrame | null>(null);
  const viewIndex = manualIndex ?? liveIndex;
  const isAnimating = reviewAnimation !== null;
  const isReviewing = manualIndex !== null || isAnimating;

  const { displayState, reviewBeforeState } = useMemo(() => {
    if (!liveState) {
      return { displayState: null, reviewBeforeState: null };
    }
    if (!isReviewing || !replayBaseline) {
      return { displayState: liveState, reviewBeforeState: null };
    }
    return {
      displayState: stateAtPly(replayBaseline, moveLog, viewIndex),
      reviewBeforeState: viewIndex > 0
        ? stateAtPly(replayBaseline, moveLog, viewIndex - 1)
        : null,
    };
  }, [isReviewing, replayBaseline, moveLog, viewIndex, liveState]);

  const positionLabel = useMemo(() => {
    if (!isReviewing) {
      return null;
    }
    return formatReviewPositionLabel(viewIndex, liveIndex, moveLog);
  }, [isReviewing, viewIndex, liveIndex, moveLog]);

  const { stepBack, stepForward, jumpToPly, goLive } = useReviewActions({
    viewIndex,
    liveIndex,
    isAnimating,
    canStepBack: viewIndex > 0 && !isAnimating,
    canStepForward: viewIndex < liveIndex && !isAnimating,
    moveLog,
    replayBaseline,
    setManualIndex,
    setReviewAnimation,
  });

  return {
    viewIndex,
    liveIndex,
    isReviewing,
    canStepBack: viewIndex > 0 && !isAnimating,
    canStepForward: viewIndex < liveIndex && !isAnimating,
    displayState,
    reviewAnimation,
    activeEntry: viewIndex > 0 ? moveLog[viewIndex - 1] ?? null : null,
    reviewBeforeState,
    positionLabel,
    focusedPly: viewIndex,
    stepBack,
    stepForward,
    jumpToPly,
    goLive,
  };
}
