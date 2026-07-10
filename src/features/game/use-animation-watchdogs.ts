import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import { useEffect } from 'react';
import { CHECKER_MOVE_DURATION_MS } from '@/features/game/move-animation';

/** Watchdogs so interrupted Reanimated finishes still unstick isAnimating. */
export function useAnimationWatchdogs(opts: {
  moveAnimation: MoveAnimationFrame | null;
  sequenceActive: boolean;
  finishOnceRef: MutableRefObject<(() => void) | null>;
  setSequenceActive: Dispatch<SetStateAction<boolean>>;
}) {
  const { moveAnimation, sequenceActive, finishOnceRef, setSequenceActive } = opts;

  useEffect(() => {
    if (!moveAnimation) {
      return;
    }
    const duration = moveAnimation.durationMs ?? CHECKER_MOVE_DURATION_MS;
    const t = setTimeout(() => finishOnceRef.current?.(), duration + 160);
    return () => clearTimeout(t);
  }, [moveAnimation, finishOnceRef]);

  useEffect(() => {
    if (!sequenceActive || moveAnimation !== null) {
      return;
    }
    const t = setTimeout(() => setSequenceActive(false), 800);
    return () => clearTimeout(t);
  }, [sequenceActive, moveAnimation, setSequenceActive]);
}
