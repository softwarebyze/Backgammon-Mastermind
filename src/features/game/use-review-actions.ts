import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback } from 'react';
import {
  buildReviewStepAnimation,
  performReviewJump,
} from '@/features/game/review-helpers';
import { hapticLight } from '@/lib/haptics';

type ReviewNav = {
  viewIndex: number;
  liveIndex: number;
  isAnimating: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  moveLog: MoveLogEntry[];
  replayBaseline: GameState | null;
  setManualIndex: (v: number | null) => void;
  setReviewAnimation: (v: MoveAnimationFrame | null) => void;
};

export function useReviewActions({
  viewIndex,
  liveIndex,
  isAnimating,
  canStepBack,
  canStepForward,
  moveLog,
  replayBaseline,
  setManualIndex,
  setReviewAnimation,
}: ReviewNav) {
  const clearAnimation = useCallback(() => setReviewAnimation(null), [setReviewAnimation]);

  const playStepAnimation = useCallback((
    targetPly: number,
    onComplete: () => void,
  ) => {
    if (!replayBaseline) {
      clearAnimation();
      onComplete();
      return;
    }
    const frame = buildReviewStepAnimation({
      replayBaseline,
      moveLog,
      targetPly,
      onFinish: () => {
        clearAnimation();
        onComplete();
      },
    });
    if (!frame) {
      clearAnimation();
      onComplete();
      return;
    }
    setReviewAnimation(frame);
  }, [clearAnimation, moveLog, replayBaseline, setReviewAnimation]);

  const stepBack = useCallback(() => {
    if (!canStepBack) {
      return;
    }
    hapticLight();
    clearAnimation();
    setManualIndex(viewIndex - 1);
  }, [canStepBack, clearAnimation, setManualIndex, viewIndex]);

  const stepForward = useCallback(() => {
    if (!canStepForward) {
      return;
    }
    hapticLight();
    const targetPly = viewIndex + 1;
    playStepAnimation(targetPly, () => {
      setManualIndex(targetPly >= liveIndex ? null : targetPly);
    });
  }, [canStepForward, liveIndex, playStepAnimation, setManualIndex, viewIndex]);

  const jumpToPly = useCallback((ply: number) => {
    performReviewJump({
      ply,
      viewIndex,
      liveIndex,
      isAnimating,
      playStepAnimation,
      setManualIndex,
      clearAnimation,
    });
  }, [clearAnimation, isAnimating, liveIndex, playStepAnimation, setManualIndex, viewIndex]);

  const goLive = useCallback(() => {
    hapticLight();
    clearAnimation();
    setManualIndex(null);
  }, [clearAnimation, setManualIndex]);

  return { stepBack, stepForward, jumpToPly, goLive };
}
