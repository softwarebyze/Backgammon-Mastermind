import type { Animated } from 'react-native';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { ReviewAnimDirection } from '@/features/game/review-navigation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { unstable_batchedUpdates } from 'react-native';

import {
  shouldAcceptReviewAnimationFinish,
  startReviewStepAnimation,
} from '@/features/game/review-navigation';
import { planReviewNavigation } from '@/features/game/review-navigator';

export type ReviewNavRefs = {
  animGenerationRef: { current: number };
  pendingDestinationRef: { current: number | null };
  isBusyRef: { current: boolean };
  executeNavigationRef: { current: (current: number, target: number) => void };
};

export type ReviewNavSetters = {
  setManualIndex: (value: number | null) => void;
  setPendingAnimTarget: (value: number | null) => void;
  setPendingAnimDirection: (value: ReviewAnimDirection | null) => void;
  setReviewAnimation: (frame: MoveAnimationFrame | null) => void;
  setPathMovePly: (value: number | null) => void;
  setIsFading: (value: boolean) => void;
};

/** Commit review navigation after a step animation — order matters for arrow/path sync. */
export function finishReviewStepAnimation(
  liveIndex: number,
  targetPly: number,
  setters: Pick<ReviewNavSetters, 'setManualIndex' | 'setPendingAnimTarget' | 'setPendingAnimDirection' | 'setReviewAnimation' | 'setPathMovePly'>,
) {
  unstable_batchedUpdates(() => {
    settleReviewIndex(liveIndex, targetPly, setters.setManualIndex);
    setters.setPathMovePly(targetPly > 0 ? targetPly : null);
    setters.setReviewAnimation(null);
    setters.setPendingAnimTarget(null);
    setters.setPendingAnimDirection(null);
  });
}

export function settleReviewIndex(liveIndex: number, ply: number, setManualIndex: ReviewNavSetters['setManualIndex']) {
  // ply === liveIndex is valid: reviewing the final turn while parked at live.
  setManualIndex(ply > liveIndex ? null : ply);
}

export function cancelReviewAnimation(
  refs: ReviewNavRefs,
  setters: Pick<ReviewNavSetters, 'setPendingAnimDirection' | 'setReviewAnimation' | 'setPathMovePly'>,
) {
  refs.animGenerationRef.current += 1;
  setters.setReviewAnimation(null);
  setters.setPendingAnimDirection(null);
  setters.setPathMovePly(null);
}

export function clearReviewPendingAnim(setters: Pick<ReviewNavSetters, 'setPendingAnimTarget' | 'setPendingAnimDirection'>) {
  setters.setPendingAnimTarget(null);
  setters.setPendingAnimDirection(null);
}

export function finishReviewNavigation(
  landedPly: number,
  refs: ReviewNavRefs,
) {
  const queued = refs.pendingDestinationRef.current;
  if (queued !== null && queued !== landedPly) {
    refs.executeNavigationRef.current(landedPly, queued);
    return;
  }
  refs.pendingDestinationRef.current = null;
  refs.isBusyRef.current = false;
}

/** Instant multi-ply jump — no board fade (fade looked like a flicker). */
export function jumpReviewInstant(args: {
  targetPly: number;
  liveIndex: number;
  boardOpacity: Animated.Value;
  refs: ReviewNavRefs;
  setters: ReviewNavSetters;
  onComplete: () => void;
}) {
  const { targetPly, liveIndex, boardOpacity, refs, setters, onComplete } = args;
  cancelReviewAnimation(refs, setters);
  clearReviewPendingAnim(setters);
  setters.setPathMovePly(targetPly > 0 ? targetPly : null);
  boardOpacity.setValue(1);
  setters.setIsFading(false);
  settleReviewIndex(liveIndex, targetPly, setters.setManualIndex);
  onComplete();
}

export function playReviewStep(args: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  fromPly: number;
  targetPly: number;
  direction: ReviewAnimDirection;
  liveIndex: number;
  refs: ReviewNavRefs;
  setters: ReviewNavSetters;
  onComplete: () => void;
}) {
  const { replayBaseline, moveLog, fromPly, targetPly, direction, liveIndex, refs, setters, onComplete } = args;
  const generation = refs.animGenerationRef.current;
  const pathMovePly = direction === 'forward' ? targetPly : targetPly + 1;
  setters.setManualIndex(fromPly);
  setters.setPendingAnimTarget(targetPly);
  setters.setPendingAnimDirection(direction);
  setters.setPathMovePly(pathMovePly);

  const frame = startReviewStepAnimation({
    replayBaseline,
    moveLog,
    targetPly,
    direction,
    generation,
    animGenerationRef: refs.animGenerationRef,
    onFinish: (finishedGeneration) => {
      if (!shouldAcceptReviewAnimationFinish(finishedGeneration, refs.animGenerationRef)) {
        return;
      }
      finishReviewStepAnimation(liveIndex, targetPly, setters);
      onComplete();
    },
  });

  if (!frame) {
    cancelReviewAnimation(refs, setters);
    finishReviewStepAnimation(liveIndex, targetPly, setters);
    onComplete();
    return;
  }
  setters.setReviewAnimation(frame);
}

export function executeReviewNavigation(args: {
  currentPly: number;
  targetPly: number;
  liveIndex: number;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  boardOpacity: Animated.Value;
  refs: ReviewNavRefs;
  setters: ReviewNavSetters;
}) {
  const { currentPly, targetPly, liveIndex, replayBaseline, moveLog, boardOpacity, refs, setters } = args;
  const plan = planReviewNavigation(currentPly, targetPly, liveIndex);

  if (plan.mode === 'live') {
    refs.pendingDestinationRef.current = null;
    cancelReviewAnimation(refs, setters);
    clearReviewPendingAnim(setters);
    setters.setPathMovePly(null);
    setters.setManualIndex(null);
    refs.isBusyRef.current = false;
    boardOpacity.setValue(1);
    setters.setIsFading(false);
    return;
  }

  if (plan.mode === 'noop') {
    refs.pendingDestinationRef.current = null;
    refs.isBusyRef.current = false;
    return;
  }

  if (plan.mode === 'jump') {
    jumpReviewInstant({
      targetPly: plan.ply,
      liveIndex,
      boardOpacity,
      refs,
      setters,
      onComplete: () => finishReviewNavigation(plan.ply, refs),
    });
    return;
  }

  if (!replayBaseline) {
    refs.isBusyRef.current = false;
    return;
  }

  const fromPly = plan.direction === 'forward' ? plan.ply - 1 : plan.ply + 1;
  playReviewStep({
    replayBaseline,
    moveLog,
    fromPly,
    targetPly: plan.ply,
    direction: plan.direction,
    liveIndex,
    refs,
    setters,
    onComplete: () => finishReviewNavigation(plan.ply, refs),
  });
}
