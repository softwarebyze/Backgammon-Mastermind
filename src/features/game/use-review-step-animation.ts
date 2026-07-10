import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { ReviewAnimDirection } from '@/features/game/review-navigation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

import {
  cancelReviewAnimation,
  clearReviewPendingAnim,
  executeReviewNavigation,
} from '@/features/game/review-step-navigation';

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
  const [pathMovePly, setPathMovePly] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const animGenerationRef = useRef(0);
  const pendingDestinationRef = useRef<number | null>(null);
  const isBusyRef = useRef(false);
  const boardOpacity = useRef(new Animated.Value(1)).current;
  const executeNavigationRef = useRef<(current: number, target: number) => void>(() => {});

  const refs = useMemo(() => ({
    animGenerationRef,
    pendingDestinationRef,
    isBusyRef,
    executeNavigationRef,
  }), []);
  const setters = useMemo(() => ({
    setManualIndex,
    setPendingAnimTarget,
    setPendingAnimDirection,
    setReviewAnimation,
    setPathMovePly,
    setIsFading,
  }), [setManualIndex]);

  const runNavigation = useCallback((currentPly: number, targetPly: number) => {
    executeReviewNavigation({
      currentPly,
      targetPly,
      liveIndex,
      replayBaseline,
      moveLog,
      boardOpacity,
      refs,
      setters,
    });
  }, [boardOpacity, liveIndex, moveLog, refs, replayBaseline, setters]);

  executeNavigationRef.current = runNavigation;

  const navigateToPly = useCallback((currentPly: number, targetPly: number) => {
    pendingDestinationRef.current = targetPly;
    if (isBusyRef.current) {
      return;
    }
    isBusyRef.current = true;
    runNavigation(currentPly, targetPly);
  }, [runNavigation]);

  const goLive = useCallback(() => {
    pendingDestinationRef.current = null;
    isBusyRef.current = false;
    cancelReviewAnimation(refs, setters);
    clearReviewPendingAnim(setters);
    setPathMovePly(null);
    setManualIndex(null);
    boardOpacity.setValue(1);
    setIsFading(false);
  }, [boardOpacity, refs, setManualIndex, setters]);

  return {
    pendingAnimTarget,
    pendingAnimDirection,
    reviewAnimation,
    pathMovePly,
    boardOpacity,
    isFading,
    isNavigating: isFading || reviewAnimation !== null,
    navigateToPly,
    goLive,
    cancelAnimation: () => {
      cancelReviewAnimation(refs, setters);
      clearReviewPendingAnim(setters);
    },
    setPendingAnimTarget,
    setPendingAnimDirection,
  };
}
