import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { ReviewAnimDirection } from '@/features/game/review-navigation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useRef, useState } from 'react';
import {
  shouldAcceptReviewAnimationFinish,
  startReviewStepAnimation,
} from '@/features/game/review-navigation';

type Options = {
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  liveIndex: number;
  setManualIndex: (value: number | null) => void;
};

export function useReviewStepAnimation({
  replayBaseline,
  moveLog,
  liveIndex,
  setManualIndex,
}: Options) {
  const [pendingAnimTarget, setPendingAnimTarget] = useState<number | null>(null);
  const [pendingAnimDirection, setPendingAnimDirection] = useState<ReviewAnimDirection | null>(null);
  const [reviewAnimation, setReviewAnimation] = useState<MoveAnimationFrame | null>(null);
  const animGenerationRef = useRef(0);

  const cancelAnimation = useCallback(() => {
    animGenerationRef.current += 1;
    setReviewAnimation(null);
    setPendingAnimDirection(null);
  }, []);

  const playStepAnimation = useCallback((
    targetPly: number,
    direction: ReviewAnimDirection,
    onComplete: () => void,
  ) => {
    if (!replayBaseline) {
      cancelAnimation();
      onComplete();
      return;
    }
    const generation = animGenerationRef.current;
    const frame = startReviewStepAnimation({
      replayBaseline,
      moveLog,
      targetPly,
      direction,
      generation,
      animGenerationRef,
      onFinish: (finishedGeneration) => {
        if (!shouldAcceptReviewAnimationFinish(finishedGeneration, animGenerationRef)) {
          return;
        }
        setReviewAnimation(null);
        setPendingAnimTarget(null);
        setPendingAnimDirection(null);
        onComplete();
      },
    });
    if (!frame) {
      cancelAnimation();
      setPendingAnimTarget(null);
      onComplete();
      return;
    }
    setReviewAnimation(frame);
  }, [cancelAnimation, moveLog, replayBaseline]);

  const stepForward = useCallback((effectivePly: number) => {
    cancelAnimation();
    const targetPly = effectivePly + 1;
    setManualIndex(effectivePly);
    setPendingAnimTarget(targetPly);
    setPendingAnimDirection('forward');
    playStepAnimation(targetPly, 'forward', () => {
      setManualIndex(targetPly >= liveIndex ? null : targetPly);
    });
  }, [cancelAnimation, liveIndex, playStepAnimation, setManualIndex]);

  const stepBack = useCallback((effectivePly: number) => {
    if (effectivePly <= 0) {
      return;
    }
    cancelAnimation();
    const targetPly = effectivePly - 1;
    setManualIndex(effectivePly);
    setPendingAnimTarget(targetPly);
    setPendingAnimDirection('backward');
    playStepAnimation(targetPly, 'backward', () => {
      setManualIndex(targetPly >= liveIndex ? null : targetPly);
    });
  }, [cancelAnimation, liveIndex, playStepAnimation, setManualIndex]);

  const goLive = useCallback(() => {
    cancelAnimation();
    setPendingAnimTarget(null);
    setManualIndex(null);
  }, [cancelAnimation, setManualIndex]);

  return {
    pendingAnimTarget,
    pendingAnimDirection,
    reviewAnimation,
    cancelAnimation,
    playStepAnimation,
    setPendingAnimTarget,
    setPendingAnimDirection,
    stepForward,
    stepBack,
    goLive,
  };
}
